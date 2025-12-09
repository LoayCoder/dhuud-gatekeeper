-- Fix can_approve_investigation: Reporter cannot approve their own incident
-- Use manager_team table for proper hierarchy lookup
CREATE OR REPLACE FUNCTION public.can_approve_investigation(_user_id uuid, _incident_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reporter_id UUID;
  v_reporter_manager_id UUID;
BEGIN
  -- Get reporter ID
  SELECT reporter_id INTO v_reporter_id FROM incidents WHERE id = _incident_id;
  
  -- CRITICAL: Reporter cannot approve their own incident (even if admin)
  IF _user_id = v_reporter_id THEN
    RETURN FALSE;
  END IF;
  
  -- HSSE Managers can approve (but not their own incidents - already checked above)
  IF has_role_by_code(_user_id, 'hsse_manager') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is the reporter's direct manager (from manager_team table)
  SELECT manager_id INTO v_reporter_manager_id
  FROM manager_team
  WHERE user_id = v_reporter_id
    AND deleted_at IS NULL
  LIMIT 1;
  
  -- Allow if user is the reporter's manager
  IF _user_id = v_reporter_manager_id THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$;

-- Fix get_incident_department_manager: Use manager_team table instead of department matching
CREATE OR REPLACE FUNCTION public.get_incident_department_manager(p_incident_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT mt.manager_id
  FROM incidents i
  JOIN manager_team mt ON mt.user_id = i.reporter_id AND mt.deleted_at IS NULL
  WHERE i.id = p_incident_id
  LIMIT 1;
$function$;