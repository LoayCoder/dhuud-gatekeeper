-- Fix can_approve_investigation function: correct role code and enhance dept rep logic
CREATE OR REPLACE FUNCTION public.can_approve_investigation(_user_id uuid, _incident_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_incident_status text;
  v_is_admin boolean;
  v_is_hsse_manager boolean;
  v_is_hsse_expert boolean;
  v_is_dept_rep boolean;
  v_reporter_id uuid;
  v_approval_manager_id uuid;
  v_investigator_id uuid;
BEGIN
  -- Get incident details
  SELECT status, reporter_id, approval_manager_id
  INTO v_incident_status, v_reporter_id, v_approval_manager_id
  FROM incidents
  WHERE id = _incident_id AND deleted_at IS NULL;

  IF v_incident_status IS NULL THEN RETURN FALSE; END IF;

  -- Get investigator if exists
  SELECT investigator_id INTO v_investigator_id
  FROM investigations
  WHERE incident_id = _incident_id AND deleted_at IS NULL
  LIMIT 1;

  -- Check roles
  v_is_admin := has_role(_user_id, 'admin'::app_role);
  v_is_hsse_manager := has_role_by_code(_user_id, 'hsse_manager');
  v_is_hsse_expert := has_role_by_code(_user_id, 'hsse_officer') 
                   OR has_role_by_code(_user_id, 'hsse_expert')
                   OR has_role_by_code(_user_id, 'hsse_investigator');
  
  -- FIXED: Use correct role code 'department_representative' instead of 'dept_rep'
  v_is_dept_rep := has_role_by_code(_user_id, 'department_representative');

  -- Pending Department Representative Approval
  IF v_incident_status = 'pending_dept_rep_approval' THEN
    -- Reporter cannot approve their own observation
    IF _user_id = v_reporter_id THEN RETURN FALSE; END IF;
    -- Assigned approval manager can approve
    IF _user_id = v_approval_manager_id THEN RETURN TRUE; END IF;
    -- Admin can approve
    IF v_is_admin THEN RETURN TRUE; END IF;
    -- ENHANCED: Any dept rep in the same department can approve
    IF v_is_dept_rep AND is_in_same_department(_user_id, _incident_id) THEN 
      RETURN TRUE; 
    END IF;
  END IF;

  -- Pending Expert Screening (for incidents/observations that need HSSE review)
  IF v_incident_status = 'pending_expert_screening' THEN
    IF v_is_admin OR v_is_hsse_manager OR v_is_hsse_expert THEN RETURN TRUE; END IF;
  END IF;

  -- Pending Investigation Assignment
  IF v_incident_status = 'pending_investigation' THEN
    IF v_is_admin OR v_is_hsse_manager THEN RETURN TRUE; END IF;
  END IF;

  -- Investigation In Progress - only assigned investigator can submit
  IF v_incident_status = 'under_investigation' THEN
    IF _user_id = v_investigator_id THEN RETURN TRUE; END IF;
  END IF;

  -- Pending Closure Review
  IF v_incident_status = 'pending_closure' THEN
    IF v_is_admin OR v_is_hsse_manager THEN RETURN TRUE; END IF;
  END IF;

  -- Pending Final Closure
  IF v_incident_status = 'pending_final_closure' THEN
    IF v_is_admin OR v_is_hsse_manager THEN RETURN TRUE; END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- Add UPDATE RLS policy for department representatives on observations
CREATE POLICY "Dept reps can update observations in their department"
ON incidents FOR UPDATE
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND status = 'pending_dept_rep_approval'
  AND has_role_by_code(auth.uid(), 'department_representative')
  AND is_in_same_department(auth.uid(), id)
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
);