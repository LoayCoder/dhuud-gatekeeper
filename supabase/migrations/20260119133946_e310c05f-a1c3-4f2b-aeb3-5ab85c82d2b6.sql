-- Fix 1: Update can_approve_violation to use incident_violation_lifecycle instead of non-existent violations table
CREATE OR REPLACE FUNCTION public.can_approve_violation(p_user_id uuid, p_violation_id uuid)
RETURNS boolean 
LANGUAGE plpgsql STABLE SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE 
  v_tenant_id uuid;
BEGIN
  -- Fix: Use incident_violation_lifecycle instead of non-existent violations table
  SELECT tenant_id INTO v_tenant_id 
  FROM incident_violation_lifecycle 
  WHERE id = p_violation_id;
  
  IF v_tenant_id IS NULL THEN 
    RETURN false; 
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.user_id = p_user_id 
      AND ura.tenant_id = v_tenant_id 
      AND r.code IN ('hsse_manager', 'hsse_expert', 'super_admin', 'admin', 'contract_controller') 
      AND r.is_active = true 
      AND p.deleted_at IS NULL
  );
END;
$$;

-- Fix 2: Update process_dept_rep_incident_decision to use correct audit log column names
CREATE OR REPLACE FUNCTION public.process_dept_rep_incident_decision(
  _incident_id uuid, 
  _user_id uuid, 
  _decision text, 
  _justification text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _can_review BOOLEAN;
  _new_status incident_status;
  _severity TEXT;
  _severity_level INTEGER;
  _tenant_id uuid;
BEGIN
  -- Validate decision
  IF _decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END IF;
  
  -- Validate justification length
  IF _justification IS NULL OR char_length(_justification) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Justification required (min 10 chars)');
  END IF;
  
  -- Check if user can review
  SELECT can_review_dept_rep_incident(_user_id, _incident_id) INTO _can_review;
  
  IF NOT _can_review THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  -- Get severity and tenant_id
  SELECT severity_v2, tenant_id INTO _severity, _tenant_id FROM incidents WHERE id = _incident_id;
  _severity_level := COALESCE(
    NULLIF(regexp_replace(_severity, '[^0-9]', '', 'g'), '')::INTEGER,
    1
  );
  
  -- Severity-based routing
  IF _decision = 'approved' THEN
    IF _severity_level <= 2 THEN
      _new_status := 'pending_expert_screening';
    ELSE
      _new_status := 'pending_department_manager_approval';
    END IF;
  ELSE
    _new_status := 'hsse_manager_escalation';
  END IF;
  
  -- Update incident
  UPDATE incidents SET 
    status = _new_status,
    dept_rep_decision = _decision,
    dept_rep_justification = _justification,
    dept_rep_reviewed_at = now(),
    dept_rep_reviewer_id = _user_id,
    updated_at = now()
  WHERE id = _incident_id;
  
  -- FIX: Use correct column names (action, actor_id instead of action_type, performed_by)
  INSERT INTO incident_audit_logs (
    incident_id,
    action,
    actor_id,
    new_value,
    tenant_id
  )
  VALUES (
    _incident_id,
    CASE WHEN _decision = 'approved' THEN 'dept_rep_incident_approved' ELSE 'dept_rep_incident_rejected' END,
    _user_id,
    jsonb_build_object(
      'decision', _decision,
      'justification', _justification,
      'severity_level', _severity_level,
      'new_status', _new_status::text
    ),
    _tenant_id
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', _new_status::text, 'severity_level', _severity_level);
END;
$$;