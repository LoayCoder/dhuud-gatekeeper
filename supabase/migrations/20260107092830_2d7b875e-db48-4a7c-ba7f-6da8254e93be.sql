-- Fix column names in admin_override_approval function
CREATE OR REPLACE FUNCTION admin_override_approval(
  _incident_id UUID,
  _admin_id UUID,
  _override_reason TEXT,
  _original_approver TEXT,
  _decision TEXT DEFAULT 'approved'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin BOOLEAN;
  _current_status TEXT;
  _new_status incident_status;
  _tenant_id UUID;
BEGIN
  -- Verify user is admin
  SELECT is_admin(_admin_id) INTO _is_admin;
  IF NOT _is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not authorized for admin override');
  END IF;
  
  -- Get current status and tenant_id
  SELECT status::text, tenant_id INTO _current_status, _tenant_id FROM incidents WHERE id = _incident_id;
  
  IF _current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Validate override reason
  IF _override_reason IS NULL OR char_length(_override_reason) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Override reason must be at least 10 characters');
  END IF;
  
  -- Determine new status based on current status
  CASE _current_status
    WHEN 'pending_dept_rep_approval' THEN _new_status := 'pending_manager_approval';
    WHEN 'pending_dept_rep_incident_review' THEN _new_status := 'pending_manager_approval';
    WHEN 'pending_manager_approval' THEN _new_status := 'investigation_in_progress';
    WHEN 'pending_hsse_escalation_review' THEN _new_status := 'pending_manager_approval';
    WHEN 'pending_hsse_validation' THEN _new_status := 'pending_manager_approval';
    WHEN 'pending_investigation_approval' THEN _new_status := 'closed';
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Cannot override status: ' || _current_status);
  END CASE;
  
  -- Update incident with admin override
  UPDATE incidents SET
    status = _new_status,
    admin_override_by = _admin_id,
    admin_override_at = now(),
    admin_override_reason = _override_reason,
    admin_override_original_approver = _original_approver,
    is_admin_override = true,
    updated_at = now()
  WHERE id = _incident_id;
  
  -- Log audit trail (FIXED: use correct column names action and actor_id)
  INSERT INTO incident_audit_logs (incident_id, action, actor_id, details, tenant_id)
  VALUES (
    _incident_id,
    'admin_override_approval',
    _admin_id,
    jsonb_build_object(
      'previous_status', _current_status,
      'new_status', _new_status::text,
      'override_reason', _override_reason,
      'original_approver', _original_approver
    ),
    _tenant_id
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', _new_status::text, 'previous_status', _current_status);
END;
$$;