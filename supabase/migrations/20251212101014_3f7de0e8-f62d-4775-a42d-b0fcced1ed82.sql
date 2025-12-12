-- Update can_approve_investigation RPC to support closure statuses
CREATE OR REPLACE FUNCTION public.can_approve_investigation(_user_id uuid, _incident_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_status TEXT;
  v_reporter_id UUID;
  v_approval_manager_id UUID;
  v_is_hsse_manager BOOLEAN := FALSE;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- Get incident details
  SELECT status::text, reporter_id, approval_manager_id 
  INTO v_incident_status, v_reporter_id, v_approval_manager_id
  FROM incidents 
  WHERE id = _incident_id AND deleted_at IS NULL;
  
  IF v_incident_status IS NULL THEN RETURN FALSE; END IF;
  
  -- Reporter cannot approve their own incidents
  IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;
  
  -- Check user roles
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura 
    JOIN roles r ON ura.role_id = r.id 
    WHERE ura.user_id = _user_id 
      AND r.code = 'hsse_manager' 
      AND ura.deleted_at IS NULL
  ) INTO v_is_hsse_manager;
  
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura 
    JOIN roles r ON ura.role_id = r.id 
    WHERE ura.user_id = _user_id 
      AND r.code = 'admin' 
      AND ura.deleted_at IS NULL
  ) INTO v_is_admin;
  
  -- For pending_manager_approval: direct manager or HSSE Manager can approve
  IF v_incident_status = 'pending_manager_approval' THEN
    IF _user_id = v_approval_manager_id OR v_is_hsse_manager OR v_is_admin THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- For hsse_manager_escalation: only HSSE Manager or Admin can approve
  IF v_incident_status = 'hsse_manager_escalation' THEN
    IF v_is_hsse_manager OR v_is_admin THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- For pending_closure: only HSSE Manager or Admin can approve
  IF v_incident_status = 'pending_closure' THEN
    IF v_is_hsse_manager OR v_is_admin THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- For pending_final_closure: only HSSE Manager or Admin can approve
  IF v_incident_status = 'pending_final_closure' THEN
    IF v_is_hsse_manager OR v_is_admin THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;