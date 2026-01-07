-- Fix the trigger function to use correct security_audit_logs columns
CREATE OR REPLACE FUNCTION public.invalidate_sessions_on_user_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    WHERE user_id = NEW.user_id AND is_active = true;
    
    -- Log to security audit log with CORRECT columns
    INSERT INTO public.security_audit_logs (
      tenant_id,
      actor_id,
      action,
      action_category,
      result,
      entity_type,
      entity_id,
      old_value,
      new_value
    ) VALUES (
      NEW.tenant_id,
      auth.uid(),
      CASE 
        WHEN NEW.is_deleted = true THEN 'user_deleted_sessions_invalidated'
        ELSE 'user_deactivated_sessions_invalidated'
      END,
      'user_management',
      'success',
      'user_session',
      NEW.id,
      jsonb_build_object('is_deleted', OLD.is_deleted, 'is_active', OLD.is_active),
      jsonb_build_object('is_deleted', NEW.is_deleted, 'is_active', NEW.is_active)
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;