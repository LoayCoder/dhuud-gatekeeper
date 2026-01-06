-- =========================================================
-- PART 1: Tenant-Scoped MFA Status Table
-- =========================================================

-- Create table for per-tenant MFA verification status
CREATE TABLE public.tenant_user_mfa_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  mfa_verified_at TIMESTAMPTZ,
  requires_setup BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.tenant_user_mfa_status ENABLE ROW LEVEL SECURITY;

-- Users can view their own MFA status
CREATE POLICY "Users can view their own MFA status"
  ON public.tenant_user_mfa_status
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own MFA status (for completing setup)
CREATE POLICY "Users can update their own MFA status"
  ON public.tenant_user_mfa_status
  FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can view/manage tenant MFA status via service role
CREATE POLICY "Service role full access"
  ON public.tenant_user_mfa_status
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_tenant_user_mfa_status_user_tenant 
  ON public.tenant_user_mfa_status(user_id, tenant_id);

-- =========================================================
-- PART 2: Session Cleanup Trigger on User Deletion/Deactivation
-- =========================================================

-- Create function to invalidate all sessions when user is deleted or deactivated
CREATE OR REPLACE FUNCTION public.invalidate_sessions_on_user_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user was deleted or deactivated
  IF (NEW.is_deleted = true AND (OLD.is_deleted IS NULL OR OLD.is_deleted = false)) 
     OR (NEW.is_active = false AND OLD.is_active = true) THEN
    
    -- Invalidate ALL active sessions for this user
    UPDATE public.user_sessions
    SET 
      is_active = false,
      invalidated_at = now(),
      invalidation_reason = CASE 
        WHEN NEW.is_deleted = true THEN 'user_deleted'
        ELSE 'user_deactivated'
      END
    WHERE user_id = NEW.id AND is_active = true;
    
    -- Log to security audit log
    INSERT INTO public.security_audit_logs (
      tenant_id,
      actor_id,
      action,
      table_name,
      record_id,
      old_value,
      new_value
    ) VALUES (
      NEW.tenant_id,
      auth.uid(),
      CASE 
        WHEN NEW.is_deleted = true THEN 'user_deleted_sessions_invalidated'
        ELSE 'user_deactivated_sessions_invalidated'
      END,
      'user_sessions',
      NEW.id,
      jsonb_build_object('is_deleted', OLD.is_deleted, 'is_active', OLD.is_active),
      jsonb_build_object('is_deleted', NEW.is_deleted, 'is_active', NEW.is_active)
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS tr_invalidate_sessions_on_user_status_change ON public.profiles;
CREATE TRIGGER tr_invalidate_sessions_on_user_status_change
  AFTER UPDATE OF is_deleted, is_active ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_sessions_on_user_status_change();

-- =========================================================
-- PART 3: Add invalidation_reason column if it doesn't exist
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_sessions' 
    AND column_name = 'invalidation_reason'
  ) THEN
    ALTER TABLE public.user_sessions ADD COLUMN invalidation_reason TEXT;
  END IF;
END $$;