-- Tighten contractor approval ownership and investigation start integrity

-- 1) Contractor consultant approval must be assignment-based, while keeping admin/HSSE manager fallback
CREATE OR REPLACE FUNCTION public.can_approve_investigation(_user_id uuid, _incident_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_incident_status text;
  v_incident_branch_id uuid;
  v_is_admin boolean;
  v_is_hsse_manager boolean;
  v_is_hsse_expert boolean;
  v_is_dept_rep boolean;
  v_is_contractor_consultant boolean;
  v_is_dept_manager boolean;
  v_reporter_id uuid;
  v_approval_manager_id uuid;
  v_investigator_id uuid;
  v_is_against_contractor boolean;
BEGIN
  SELECT status, reporter_id, approval_manager_id, branch_id,
         COALESCE(related_contractor_company_id IS NOT NULL, false)
  INTO v_incident_status, v_reporter_id, v_approval_manager_id, v_incident_branch_id, v_is_against_contractor
  FROM public.incidents
  WHERE id = _incident_id AND deleted_at IS NULL;

  IF v_incident_status IS NULL THEN RETURN FALSE; END IF;

  v_is_admin := public.has_role(_user_id, 'admin'::public.app_role);
  v_is_hsse_manager := public.has_role_by_code(_user_id, 'hsse_manager');
  v_is_hsse_expert := public.has_role_by_code(_user_id, 'hsse_officer')
                    OR public.has_role_by_code(_user_id, 'hsse_expert')
                    OR public.has_role_by_code(_user_id, 'hsse_investigator');
  v_is_dept_rep := public.has_role_by_code(_user_id, 'department_representative');
  v_is_dept_manager := public.has_role_by_code(_user_id, 'department_manager');
  v_is_contractor_consultant := public.has_contractor_consultant_access_for_branch(_user_id, v_incident_branch_id);

  IF v_incident_status IN (
    'expert_screening', 'pending_consultant_screening',
    'pending_consultant_review', 'pending_consultant_actions',
    'pending_site_client_approval', 'pending_contractor_implementation',
    'pending_consultant_verification'
  ) THEN
    -- Assigned consultant only (not any consultant in the branch)
    IF v_is_contractor_consultant
       AND v_is_against_contractor
       AND v_approval_manager_id = _user_id THEN
      RETURN TRUE;
    END IF;

    IF v_is_admin THEN RETURN TRUE; END IF;
    IF v_is_hsse_manager THEN RETURN TRUE; END IF;

    IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;

    IF v_is_hsse_expert AND NOT v_is_against_contractor THEN RETURN TRUE; END IF;
  END IF;

  IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;

  IF v_incident_status = 'pending_manager_approval' THEN
    IF v_is_admin OR v_is_dept_manager THEN RETURN TRUE; END IF;
    IF _user_id = v_approval_manager_id THEN RETURN TRUE; END IF;
  END IF;

  IF v_incident_status = 'pending_dept_rep_review' THEN
    IF v_is_admin OR v_is_dept_rep OR v_is_hsse_manager THEN RETURN TRUE; END IF;
  END IF;

  IF v_incident_status = 'pending_hsse_review' THEN
    IF v_is_admin OR v_is_hsse_manager OR v_is_hsse_expert THEN RETURN TRUE; END IF;
  END IF;

  IF v_incident_status = 'under_investigation' THEN
    SELECT investigator_id INTO v_investigator_id
    FROM public.investigations
    WHERE incident_id = _incident_id AND deleted_at IS NULL
    LIMIT 1;

    IF _user_id = v_investigator_id THEN RETURN TRUE; END IF;
    IF v_is_admin OR v_is_hsse_manager THEN RETURN TRUE; END IF;
  END IF;

  IF v_incident_status = 'pending_closure' THEN
    IF v_is_admin OR v_is_hsse_manager THEN RETURN TRUE; END IF;
  END IF;

  RETURN FALSE;
END;
$function$;

-- 2) Explicit backend gate for starting an investigation
DROP FUNCTION IF EXISTS public.can_start_investigation(uuid, uuid);
CREATE OR REPLACE FUNCTION public.can_start_investigation(p_incident_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_investigator_id uuid;
  v_started_at timestamptz;
BEGIN
  SELECT i.status, inv.investigator_id, inv.started_at
  INTO v_status, v_investigator_id, v_started_at
  FROM public.incidents i
  LEFT JOIN public.investigations inv
    ON inv.incident_id = i.id
   AND inv.deleted_at IS NULL
  WHERE i.id = p_incident_id
    AND i.deleted_at IS NULL
  LIMIT 1;

  IF v_status IS NULL THEN RETURN FALSE; END IF;
  IF v_status NOT IN ('investigation_pending', 'under_investigation') THEN RETURN FALSE; END IF;
  IF v_investigator_id IS NULL THEN RETURN FALSE; END IF;
  IF v_started_at IS NOT NULL THEN RETURN FALSE; END IF;

  RETURN v_investigator_id = p_user_id;
END;
$function$;

-- 3) Block premature investigation starts at the database layer
CREATE OR REPLACE FUNCTION public.enforce_investigation_start_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_incident_status text;
BEGIN
  IF NEW.started_at IS NOT NULL AND (OLD.started_at IS NULL OR NEW.started_at IS DISTINCT FROM OLD.started_at) THEN
    SELECT status INTO v_incident_status
    FROM public.incidents
    WHERE id = NEW.incident_id
      AND deleted_at IS NULL;

    IF v_incident_status IS NULL THEN
      RAISE EXCEPTION 'Incident not found for investigation start';
    END IF;

    IF v_incident_status NOT IN ('investigation_pending', 'under_investigation') THEN
      RAISE EXCEPTION 'Cannot start investigation while incident status is %', v_incident_status;
    END IF;

    v_actor_id := auth.uid();
    IF v_actor_id IS NOT NULL AND NOT public.can_start_investigation(NEW.incident_id, v_actor_id) THEN
      RAISE EXCEPTION 'Only the assigned investigator can start this investigation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_investigation_start_transition ON public.investigations;
CREATE TRIGGER trg_enforce_investigation_start_transition
BEFORE UPDATE ON public.investigations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_investigation_start_transition();

-- 4) Block invalid incident status transition into investigation in progress
CREATE OR REPLACE FUNCTION public.enforce_incident_investigation_progress_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_investigator_id uuid;
  v_started_at timestamptz;
BEGIN
  IF NEW.status = 'investigation_in_progress' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF OLD.status NOT IN ('investigation_pending', 'under_investigation') THEN
      RAISE EXCEPTION 'Invalid transition from % to investigation_in_progress', OLD.status;
    END IF;

    SELECT investigator_id, started_at
    INTO v_investigator_id, v_started_at
    FROM public.investigations
    WHERE incident_id = NEW.id
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_investigator_id IS NULL OR v_started_at IS NULL THEN
      RAISE EXCEPTION 'Investigation must be assigned and started before incident can move to investigation_in_progress';
    END IF;

    v_actor_id := auth.uid();
    IF v_actor_id IS NOT NULL AND v_actor_id <> v_investigator_id THEN
      RAISE EXCEPTION 'Only the assigned investigator can move this incident to investigation_in_progress';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_incident_investigation_progress_transition ON public.incidents;
CREATE TRIGGER trg_enforce_incident_investigation_progress_transition
BEFORE UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.enforce_incident_investigation_progress_transition();

-- 5) Correct existing invalid premature-start records in consultant workflow
UPDATE public.investigations inv
SET started_at = NULL,
    investigator_id = NULL,
    updated_at = now()
FROM public.incidents i
WHERE i.id = inv.incident_id
  AND i.deleted_at IS NULL
  AND inv.deleted_at IS NULL
  AND i.status IN ('expert_screening', 'pending_consultant_screening', 'pending_consultant_review', 'pending_consultant_actions')
  AND (inv.started_at IS NOT NULL OR inv.investigator_id IS NOT NULL);