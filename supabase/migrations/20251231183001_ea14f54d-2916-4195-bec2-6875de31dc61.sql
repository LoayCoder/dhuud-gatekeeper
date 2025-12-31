-- Fix the get_department_representative function (remove deleted_at reference)
CREATE OR REPLACE FUNCTION public.get_department_representative(p_department_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ura.user_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  JOIN profiles p ON p.id = ura.user_id
  WHERE r.code = 'department_representative'
    AND p.assigned_department_id = p_department_id
    AND r.is_active = true
  LIMIT 1;
$$;

-- Function to check if user can review dept rep incident
CREATE OR REPLACE FUNCTION public.can_review_dept_rep_incident(_user_id UUID, _incident_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_role BOOLEAN;
  _is_same_dept BOOLEAN;
  _incident_status TEXT;
BEGIN
  -- Check if user has dept rep role
  SELECT has_role_by_code(_user_id, 'department_representative') INTO _has_role;
  
  IF NOT _has_role THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is in same department as reporter
  SELECT (reporter_dept.assigned_department_id = user_dept.assigned_department_id)
  INTO _is_same_dept
  FROM incidents i
  JOIN profiles reporter_dept ON reporter_dept.id = i.reporter_id
  JOIN profiles user_dept ON user_dept.id = _user_id
  WHERE i.id = _incident_id;
  
  IF NOT _is_same_dept THEN
    RETURN FALSE;
  END IF;
  
  -- Check if incident is in correct status for review
  SELECT status::text INTO _incident_status FROM incidents WHERE id = _incident_id;
  
  RETURN _incident_status = 'pending_dept_rep_incident_review';
END;
$$;

-- Function to check if user can approve dept rep observation
CREATE OR REPLACE FUNCTION public.can_approve_dept_rep_observation(_user_id UUID, _incident_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_role BOOLEAN;
  _is_same_dept BOOLEAN;
  _incident_status TEXT;
  _event_type TEXT;
BEGIN
  -- Check if user has dept rep role
  SELECT has_role_by_code(_user_id, 'department_representative') INTO _has_role;
  
  IF NOT _has_role THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is in same department as reporter
  SELECT (reporter_dept.assigned_department_id = user_dept.assigned_department_id)
  INTO _is_same_dept
  FROM incidents i
  JOIN profiles reporter_dept ON reporter_dept.id = i.reporter_id
  JOIN profiles user_dept ON user_dept.id = _user_id
  WHERE i.id = _incident_id;
  
  IF NOT _is_same_dept THEN
    RETURN FALSE;
  END IF;
  
  -- Check if it's an observation in correct status
  SELECT status::text, event_type INTO _incident_status, _event_type 
  FROM incidents WHERE id = _incident_id;
  
  RETURN _event_type = 'observation' AND _incident_status = 'pending_dept_rep_approval';
END;
$$;

-- Function to process Dept Rep incident decision
CREATE OR REPLACE FUNCTION public.process_dept_rep_incident_decision(
  _incident_id UUID,
  _user_id UUID,
  _decision TEXT,
  _justification TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _can_review BOOLEAN;
  _new_status incident_status;
BEGIN
  -- Validate decision
  IF _decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision. Must be approved or rejected.');
  END IF;
  
  -- Validate justification length
  IF _justification IS NULL OR char_length(_justification) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Justification is required and must be at least 10 characters.');
  END IF;
  
  -- Check if user can review
  SELECT can_review_dept_rep_incident(_user_id, _incident_id) INTO _can_review;
  
  IF NOT _can_review THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not authorized to review this incident.');
  END IF;
  
  -- Determine new status based on decision
  IF _decision = 'approved' THEN
    _new_status := 'pending_manager_approval';
  ELSE
    _new_status := 'hsse_manager_escalation';
  END IF;
  
  -- Update incident
  UPDATE incidents
  SET 
    status = _new_status,
    dept_rep_decision = _decision,
    dept_rep_justification = _justification,
    dept_rep_reviewed_at = now(),
    dept_rep_reviewer_id = _user_id,
    updated_at = now()
  WHERE id = _incident_id;
  
  -- Log audit trail
  INSERT INTO incident_audit_logs (
    incident_id,
    action_type,
    performed_by,
    details,
    tenant_id
  )
  SELECT 
    _incident_id,
    CASE WHEN _decision = 'approved' THEN 'dept_rep_incident_approved' ELSE 'dept_rep_incident_rejected' END,
    _user_id,
    jsonb_build_object(
      'decision', _decision,
      'justification', _justification,
      'new_status', _new_status::text
    ),
    i.tenant_id
  FROM incidents i WHERE i.id = _incident_id;
  
  RETURN jsonb_build_object('success', true, 'new_status', _new_status::text);
END;
$$;