-- Update can_approve_investigation RPC to handle Contractor Consultant workflow statuses
-- This fixes the issue where Contractor Consultants cannot see/act on contractor-related observations

CREATE OR REPLACE FUNCTION public.can_approve_investigation(_user_id uuid, _incident_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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
  -- Get incident details including branch_id and contractor flag
  SELECT status, reporter_id, approval_manager_id, branch_id, 
         COALESCE(related_contractor_company_id IS NOT NULL, false)
  INTO v_incident_status, v_reporter_id, v_approval_manager_id, v_incident_branch_id, v_is_against_contractor
  FROM incidents
  WHERE id = _incident_id AND deleted_at IS NULL;

  IF v_incident_status IS NULL THEN RETURN FALSE; END IF;

  -- Check roles using existing helper functions
  v_is_admin := has_role(_user_id, 'admin'::app_role);
  v_is_hsse_manager := has_role_by_code(_user_id, 'hsse_manager');
  v_is_hsse_expert := has_role_by_code(_user_id, 'hsse_officer') 
                   OR has_role_by_code(_user_id, 'hsse_expert')
                   OR has_role_by_code(_user_id, 'hsse_investigator');
  v_is_dept_rep := has_role_by_code(_user_id, 'department_representative');
  v_is_dept_manager := has_role_by_code(_user_id, 'department_manager');
  
  -- Check Contractor Consultant access for the incident's branch
  v_is_contractor_consultant := has_contractor_consultant_access_for_branch(_user_id, v_incident_branch_id);

  -- =====================================================
  -- CONTRACTOR CONSULTANT WORKFLOW STATUSES
  -- =====================================================
  -- Handle both legacy (expert_screening) and new statuses for contractor observations
  IF v_incident_status IN ('expert_screening', 'pending_consultant_screening', 
                           'pending_consultant_review', 'pending_consultant_actions') THEN
    -- Reporter cannot approve their own observation
    IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;
    
    -- Contractor Consultant can approve contractor-related observations
    IF v_is_contractor_consultant AND v_is_against_contractor THEN RETURN TRUE; END IF;
    
    -- Admin can always approve
    IF v_is_admin THEN RETURN TRUE; END IF;
    
    -- HSSE Manager can approve as fallback
    IF v_is_hsse_manager THEN RETURN TRUE; END IF;
  END IF;

  -- =====================================================
  -- STANDARD WORKFLOW STATUSES
  -- =====================================================
  
  -- Pending Manager Approval
  IF v_incident_status = 'pending_manager_approval' THEN
    IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;
    IF v_is_admin OR v_is_dept_manager THEN RETURN TRUE; END IF;
  END IF;

  -- HSSE Manager Escalation
  IF v_incident_status = 'hsse_manager_escalation' THEN
    IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;
    IF v_is_admin OR v_is_hsse_manager THEN RETURN TRUE; END IF;
  END IF;

  -- Pending Closure / Final Closure
  IF v_incident_status IN ('pending_closure', 'pending_final_closure') THEN
    IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;
    IF v_is_admin OR v_is_hsse_manager THEN RETURN TRUE; END IF;
  END IF;

  -- Pending Dept Rep Approval
  IF v_incident_status = 'pending_dept_rep_approval' THEN
    IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;
    IF v_is_admin OR v_is_dept_rep THEN RETURN TRUE; END IF;
  END IF;

  -- Pending Dept Rep Incident Review
  IF v_incident_status = 'pending_dept_rep_incident_review' THEN
    IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;
    IF v_is_admin OR v_is_dept_rep THEN RETURN TRUE; END IF;
  END IF;

  -- Default: no approval permission
  RETURN FALSE;
END;
$$;