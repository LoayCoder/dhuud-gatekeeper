-- Fix the log_gate_pass_changes trigger function to include all required NOT NULL columns
CREATE OR REPLACE FUNCTION public.log_gate_pass_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log meaningful changes, not every update
  IF TG_OP = 'UPDATE' AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.pm_approved_by IS DISTINCT FROM NEW.pm_approved_by OR
    OLD.safety_approved_by IS DISTINCT FROM NEW.safety_approved_by OR
    OLD.security_approved_by IS DISTINCT FROM NEW.security_approved_by OR
    OLD.contractor_approved_by IS DISTINCT FROM NEW.contractor_approved_by OR
    OLD.entry_time IS DISTINCT FROM NEW.entry_time OR
    OLD.exit_time IS DISTINCT FROM NEW.exit_time OR
    OLD.rejected_by IS DISTINCT FROM NEW.rejected_by
  ) THEN
    INSERT INTO security_audit_logs (
      tenant_id, actor_id, action, action_category, entity_type, entity_id, 
      entity_identifier, result, old_value, new_value, metadata, created_at
    ) VALUES (
      NEW.tenant_id,
      auth.uid(),
      CASE 
        WHEN NEW.status = 'approved' AND OLD.status = 'pending_security_approval' THEN 'gate_pass_security_approved'
        WHEN NEW.status = 'approved' AND OLD.status = 'pending_safety_approval' THEN 'gate_pass_safety_approved'
        WHEN NEW.status = 'approved' AND OLD.status = 'pending_pm_approval' THEN 'gate_pass_pm_approved'
        WHEN NEW.status = 'rejected' THEN 'gate_pass_rejected'
        WHEN NEW.entry_time IS NOT NULL AND OLD.entry_time IS NULL THEN 'gate_pass_entry'
        WHEN NEW.exit_time IS NOT NULL AND OLD.exit_time IS NULL THEN 'gate_pass_exit'
        WHEN NEW.status = 'expired' THEN 'gate_pass_expired'
        WHEN NEW.status = 'cancelled' THEN 'gate_pass_cancelled'
        ELSE 'gate_pass_updated'
      END,
      'gate_pass', -- action_category (NOT NULL)
      'material_gate_pass', -- entity_type
      NEW.id, -- entity_id
      NEW.reference_number, -- entity_identifier
      'success', -- result (NOT NULL)
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      jsonb_build_object(
        'reference_number', NEW.reference_number,
        'pass_type', NEW.pass_type
      ),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Now fix the gate pass GP-2026-00001 to correct state (should be pending_club_mgmt_ack after dept rep approval)
UPDATE public.material_gate_passes
SET 
  status = 'pending_club_mgmt_ack',
  security_approved_by = NULL,
  security_approved_at = NULL,
  qr_code_token = NULL
WHERE reference_number = 'GP-2026-00001'
AND status = 'approved'
AND security_approved_by IS NULL;