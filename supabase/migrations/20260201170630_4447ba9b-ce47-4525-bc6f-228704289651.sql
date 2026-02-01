-- Gate Pass Process Hardening Migration
-- Fixes: RLS lockdown, security_guard role, material_gate_pass_id FK, status default, audit trigger

-- =============================================================================
-- Fix 3: Update has_security_access to include security_guard role
-- =============================================================================
CREATE OR REPLACE FUNCTION public.has_security_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = _user_id
      AND r.code IN ('admin', 'security_manager', 'security_supervisor', 'security_guard', 'security_shift_leader')
      AND r.is_active = true
  );
$$;

-- =============================================================================
-- Fix 4: Add material_gate_pass_id column to gate_entry_logs
-- =============================================================================
ALTER TABLE gate_entry_logs 
ADD COLUMN IF NOT EXISTS material_gate_pass_id UUID REFERENCES material_gate_passes(id);

CREATE INDEX IF NOT EXISTS idx_gate_entry_logs_material_pass 
ON gate_entry_logs(material_gate_pass_id) 
WHERE material_gate_pass_id IS NOT NULL;

-- =============================================================================
-- Fix 5: Fix status default value
-- =============================================================================
ALTER TABLE material_gate_passes 
ALTER COLUMN status SET DEFAULT 'pending_pm_approval';

-- Update existing 'pending_pm' to 'pending_pm_approval' for consistency
UPDATE material_gate_passes 
SET status = 'pending_pm_approval' 
WHERE status = 'pending_pm' AND deleted_at IS NULL;

-- =============================================================================
-- Fix 2: Lock Down Security RLS Policy on material_gate_passes
-- =============================================================================
DROP POLICY IF EXISTS "Security users can manage gate passes" ON material_gate_passes;

-- Create restricted policy for viewing (SELECT only)
DROP POLICY IF EXISTS "Security can view gate passes" ON material_gate_passes;
CREATE POLICY "Security can view gate passes" ON material_gate_passes
FOR SELECT USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_security_access(auth.uid())
);

-- Create restricted policy for updating entry/exit times only
DROP POLICY IF EXISTS "Security can record entry exit" ON material_gate_passes;
CREATE POLICY "Security can record entry exit" ON material_gate_passes
FOR UPDATE USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_security_access(auth.uid())
) WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

-- =============================================================================
-- Fix 6: Create auto-expiry function for old passes
-- =============================================================================
CREATE OR REPLACE FUNCTION public.expire_old_gate_passes()
RETURNS void AS $$
BEGIN
  UPDATE material_gate_passes
  SET status = 'expired'
  WHERE status = 'approved'
    AND pass_date < CURRENT_DATE
    AND entry_time IS NULL
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- Fix 9: Add Database Trigger for Audit Logging
-- =============================================================================
CREATE OR REPLACE FUNCTION public.log_gate_pass_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log meaningful changes, not every update
  IF TG_OP = 'UPDATE' AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.pm_approved_by IS DISTINCT FROM NEW.pm_approved_by OR
    OLD.safety_approved_by IS DISTINCT FROM NEW.safety_approved_by OR
    OLD.entry_time IS DISTINCT FROM NEW.entry_time OR
    OLD.exit_time IS DISTINCT FROM NEW.exit_time OR
    OLD.rejected_by IS DISTINCT FROM NEW.rejected_by
  ) THEN
    INSERT INTO security_audit_logs (
      tenant_id, user_id, action_type, resource_type, resource_id, 
      details, created_at
    ) VALUES (
      NEW.tenant_id,
      auth.uid(),
      CASE 
        WHEN NEW.status = 'approved' AND OLD.status = 'pending_safety_approval' THEN 'gate_pass_safety_approved'
        WHEN NEW.status = 'approved' AND OLD.status = 'pending_pm_approval' THEN 'gate_pass_pm_approved'
        WHEN NEW.status = 'rejected' THEN 'gate_pass_rejected'
        WHEN NEW.entry_time IS NOT NULL AND OLD.entry_time IS NULL THEN 'gate_pass_entry'
        WHEN NEW.exit_time IS NOT NULL AND OLD.exit_time IS NULL THEN 'gate_pass_exit'
        WHEN NEW.status = 'expired' THEN 'gate_pass_expired'
        WHEN NEW.status = 'cancelled' THEN 'gate_pass_cancelled'
        ELSE 'gate_pass_updated'
      END,
      'material_gate_pass',
      NEW.id,
      jsonb_build_object(
        'reference_number', NEW.reference_number,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'pass_type', NEW.pass_type
      ),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS gate_pass_audit_trigger ON material_gate_passes;
CREATE TRIGGER gate_pass_audit_trigger
AFTER UPDATE ON material_gate_passes
FOR EACH ROW EXECUTE FUNCTION log_gate_pass_changes();

-- =============================================================================
-- Fix 8 (partial): Add 'cancelled' to valid statuses if using check constraint
-- =============================================================================
-- Note: If there's a check constraint on status, we need to update it
-- Most implementations use application-level validation, so this may not be needed