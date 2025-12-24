-- Update can_approve_investigation function to handle pending_dept_rep_approval status
CREATE OR REPLACE FUNCTION public.can_approve_investigation(_user_id uuid, _incident_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_status TEXT;
  v_reporter_id UUID;
  v_approval_manager_id UUID;
  v_closure_requested_by UUID;
  v_is_hsse_manager BOOLEAN := FALSE;
  v_is_admin BOOLEAN := FALSE;
  v_is_dept_rep BOOLEAN := FALSE;
BEGIN
  -- Get incident details including closure requester
  SELECT status::text, reporter_id, approval_manager_id, closure_requested_by
  INTO v_incident_status, v_reporter_id, v_approval_manager_id, v_closure_requested_by
  FROM incidents 
  WHERE id = _incident_id AND deleted_at IS NULL;
  
  IF v_incident_status IS NULL THEN RETURN FALSE; END IF;
  
  -- Check user roles
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura 
    JOIN roles r ON ura.role_id = r.id 
    WHERE ura.user_id = _user_id 
      AND r.code = 'hsse_manager'
  ) INTO v_is_hsse_manager;
  
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura 
    JOIN roles r ON ura.role_id = r.id 
    WHERE ura.user_id = _user_id 
      AND r.code = 'admin'
  ) INTO v_is_admin;

  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura 
    JOIN roles r ON ura.role_id = r.id 
    WHERE ura.user_id = _user_id 
      AND r.code = 'dept_rep'
  ) INTO v_is_dept_rep;
  
  -- For pending_dept_rep_approval: Assigned dept rep or any dept rep can approve
  IF v_incident_status = 'pending_dept_rep_approval' THEN
    -- Reporter cannot approve their own observation
    IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;
    -- If user is the assigned approval manager (dept rep)
    IF _user_id = v_approval_manager_id THEN RETURN TRUE; END IF;
    -- Admin can also approve
    IF v_is_admin THEN RETURN TRUE; END IF;
  END IF;
  
  -- For pending_manager_approval: Reporter cannot approve their own incident
  IF v_incident_status = 'pending_manager_approval' THEN
    IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;
    IF _user_id = v_approval_manager_id OR v_is_hsse_manager OR v_is_admin THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- For hsse_manager_escalation: Reporter cannot approve their own incident
  IF v_incident_status = 'hsse_manager_escalation' THEN
    IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;
    IF v_is_hsse_manager OR v_is_admin THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- For pending_closure: Closure REQUESTER cannot approve their own closure request
  -- (but reporter CAN approve if they're HSSE Manager/Admin and didn't request closure)
  IF v_incident_status = 'pending_closure' THEN
    IF _user_id = v_closure_requested_by THEN RETURN FALSE; END IF;
    IF v_is_hsse_manager OR v_is_admin THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- For pending_final_closure: Same logic as pending_closure
  IF v_incident_status = 'pending_final_closure' THEN
    IF _user_id = v_closure_requested_by THEN RETURN FALSE; END IF;
    IF v_is_hsse_manager OR v_is_admin THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;