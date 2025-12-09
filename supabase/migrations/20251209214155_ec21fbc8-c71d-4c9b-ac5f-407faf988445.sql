
CREATE OR REPLACE FUNCTION public.can_approve_investigation(_user_id uuid, _incident_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reporter_id UUID;
  v_status TEXT;
  v_reporter_manager_id UUID;
BEGIN
  -- Get reporter ID and status
  SELECT reporter_id, status INTO v_reporter_id, v_status 
  FROM incidents WHERE id = _incident_id;
  
  -- CRITICAL: Reporter cannot approve their own incident (even if admin)
  IF _user_id = v_reporter_id THEN
    RETURN FALSE;
  END IF;
  
  -- For HSSE Manager escalations - only HSSE Managers can approve
  IF v_status = 'hsse_manager_escalation' THEN
    RETURN has_role_by_code(_user_id, 'hsse_manager');
  END IF;
  
  -- For pending_manager_approval status
  IF v_status = 'pending_manager_approval' THEN
    -- HSSE Managers can approve
    IF has_role_by_code(_user_id, 'hsse_manager') THEN
      RETURN TRUE;
    END IF;
    
    -- Check if user is the reporter's direct manager
    SELECT manager_id INTO v_reporter_manager_id
    FROM manager_team
    WHERE user_id = v_reporter_id
      AND deleted_at IS NULL
    LIMIT 1;
    
    -- Allow if user is the reporter's manager
    IF _user_id = v_reporter_manager_id THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$function$;
