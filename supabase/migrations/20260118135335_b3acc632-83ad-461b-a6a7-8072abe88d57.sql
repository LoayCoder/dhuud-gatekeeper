-- Allow Contractor Consultants to work on observations they reported
-- Business rule: Contractor observations go directly to Contractor Consultant
-- who can screen and add actions without self-approval restrictions

CREATE OR REPLACE FUNCTION public.can_approve_investigation(_user_id uuid, _incident_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Get incident details
  SELECT status, reporter_id, approval_manager_id, branch_id, 
         COALESCE(related_contractor_company_id IS NOT NULL, false)
  INTO v_incident_status, v_reporter_id, v_approval_manager_id, v_incident_branch_id, v_is_against_contractor
  FROM incidents
  WHERE id = _incident_id AND deleted_at IS NULL;

  IF v_incident_status IS NULL THEN RETURN FALSE; END IF;

  -- Check roles
  v_is_admin := has_role(_user_id, 'admin'::app_role);
  v_is_hsse_manager := has_role_by_code(_user_id, 'hsse_manager');
  v_is_hsse_expert := has_role_by_code(_user_id, 'hsse_officer') 
                   OR has_role_by_code(_user_id, 'hsse_expert')
                   OR has_role_by_code(_user_id, 'hsse_investigator');
  v_is_dept_rep := has_role_by_code(_user_id, 'department_representative');
  v_is_dept_manager := has_role_by_code(_user_id, 'department_manager');
  v_is_contractor_consultant := has_contractor_consultant_access_for_branch(_user_id, v_incident_branch_id);

  -- =====================================================
  -- CONTRACTOR CONSULTANT WORKFLOW STATUSES
  -- No self-approval check for Contractor Consultant workflow
  -- Business rule: Contractor observations go directly to Consultant
  -- Consultant can screen and add actions even if they reported it
  -- =====================================================
  IF v_incident_status IN ('expert_screening', 'pending_consultant_screening', 
                           'pending_consultant_review', 'pending_consultant_actions',
                           'pending_site_client_approval', 'pending_contractor_implementation',
                           'pending_consultant_verification') THEN
    
    -- Contractor Consultant can approve contractor-related observations (NO self-block)
    IF v_is_contractor_consultant AND v_is_against_contractor THEN 
      RETURN TRUE; 
    END IF;
    
    -- Admin can always approve
    IF v_is_admin THEN RETURN TRUE; END IF;
    
    -- HSSE Manager can approve as fallback
    IF v_is_hsse_manager THEN RETURN TRUE; END IF;
    
    -- For non-contractor observations in these statuses, apply self-approval restriction
    IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;
    
    -- HSSE Expert for non-contractor observations
    IF v_is_hsse_expert THEN RETURN TRUE; END IF;
  END IF;

  -- =====================================================
  -- STANDARD WORKFLOW STATUSES (keep self-approval check)
  -- =====================================================
  
  -- Reporter cannot approve their own observation in standard workflow
  IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;

  -- Pending Manager Approval
  IF v_incident_status = 'pending_manager_approval' THEN
    IF v_is_admin OR v_is_dept_manager THEN RETURN TRUE; END IF;
    IF _user_id = v_approval_manager_id THEN RETURN TRUE; END IF;
  END IF;

  -- Pending Dept Rep Review
  IF v_incident_status = 'pending_dept_rep_review' THEN
    IF v_is_admin OR v_is_dept_rep OR v_is_hsse_manager THEN RETURN TRUE; END IF;
  END IF;

  -- Pending HSSE Review
  IF v_incident_status = 'pending_hsse_review' THEN
    IF v_is_admin OR v_is_hsse_manager OR v_is_hsse_expert THEN RETURN TRUE; END IF;
  END IF;

  -- Under Investigation
  IF v_incident_status = 'under_investigation' THEN
    SELECT investigator_id INTO v_investigator_id
    FROM investigations
    WHERE incident_id = _incident_id AND deleted_at IS NULL
    LIMIT 1;
    
    IF _user_id = v_investigator_id THEN RETURN TRUE; END IF;
    IF v_is_admin OR v_is_hsse_manager THEN RETURN TRUE; END IF;
  END IF;

  -- Pending Closure
  IF v_incident_status = 'pending_closure' THEN
    IF v_is_admin OR v_is_hsse_manager THEN RETURN TRUE; END IF;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.can_approve_investigation IS 'Determines if a user can approve/act on an investigation. Contractor Consultants can work on contractor observations they reported (no self-approval restriction for consultant workflow).';