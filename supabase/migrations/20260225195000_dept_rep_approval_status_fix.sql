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
  
  RETURN _event_type = 'observation' AND _incident_status IN ('pending_dept_rep_approval', 'pending_dept_rep_mandatory_action', 'pending_dept_rep_review');
END;
$$;
