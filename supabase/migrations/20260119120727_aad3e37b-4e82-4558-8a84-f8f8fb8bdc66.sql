-- Fix all functions that incorrectly reference non-existent columns
-- The incidents table uses approval_manager_id, not contractor_consultant_id/department_rep_id/assigned_investigator_id

-- 1. Fix auto_route_observation_on_submit() trigger function
CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
  v_site_id uuid;
  v_contractor_consultant_id uuid;
  v_department_rep_id uuid;
  v_hsse_officer_id uuid;
BEGIN
  -- Only process observations that are being submitted
  IF NEW.event_type != 'observation' OR NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;

  -- Get branch and site from the incident
  v_branch_id := NEW.branch_id;
  v_site_id := NEW.site_id;

  -- Find contractor consultant for this contractor company (if applicable)
  IF NEW.contractor_company_id IS NOT NULL THEN
    SELECT p.id INTO v_contractor_consultant_id
    FROM profiles p
    JOIN user_role_assignments ura ON ura.user_id = p.id
    JOIN roles r ON r.id = ura.role_id
    WHERE r.code = 'contractor_consultant'
      AND r.is_active = true
      AND p.tenant_id = NEW.tenant_id
      AND p.assigned_branch_id = v_branch_id
    LIMIT 1;
  END IF;

  -- Find department representative for this site
  IF v_site_id IS NOT NULL THEN
    SELECT p.id INTO v_department_rep_id
    FROM profiles p
    JOIN user_role_assignments ura ON ura.user_id = p.id
    JOIN roles r ON r.id = ura.role_id
    WHERE r.code = 'department_representative'
      AND r.is_active = true
      AND p.tenant_id = NEW.tenant_id
      AND p.assigned_branch_id = v_branch_id
    LIMIT 1;
  END IF;

  -- Find HSSE officer for this branch
  SELECT p.id INTO v_hsse_officer_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE r.code IN ('hsse_officer', 'hsse_manager')
    AND r.is_active = true
    AND p.tenant_id = NEW.tenant_id
    AND p.assigned_branch_id = v_branch_id
  LIMIT 1;

  -- Update the incident with the approval manager (first available in priority order)
  -- Use approval_manager_id which is the correct column in incidents table
  UPDATE incidents
  SET 
    approval_manager_id = COALESCE(v_contractor_consultant_id, v_department_rep_id, v_hsse_officer_id),
    status = 'pending_dept_rep_approval',
    updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- 2. Drop and recreate reroute_observation_to_new_site (2-param version)
DROP FUNCTION IF EXISTS public.reroute_observation_to_new_site(uuid, uuid);

CREATE OR REPLACE FUNCTION public.reroute_observation_to_new_site(
  p_incident_id uuid,
  p_new_branch_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_contractor_consultant_id uuid;
  v_department_rep_id uuid;
  v_hsse_officer_id uuid;
  v_result jsonb;
BEGIN
  -- Get tenant_id from the incident
  SELECT tenant_id INTO v_tenant_id
  FROM incidents
  WHERE id = p_incident_id AND event_type = 'observation';

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not found');
  END IF;

  -- Find contractor consultant for new branch
  SELECT p.id INTO v_contractor_consultant_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE r.code = 'contractor_consultant'
    AND r.is_active = true
    AND p.tenant_id = v_tenant_id
    AND p.assigned_branch_id = p_new_branch_id
  LIMIT 1;

  -- Find department representative for new branch
  SELECT p.id INTO v_department_rep_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE r.code = 'department_representative'
    AND r.is_active = true
    AND p.tenant_id = v_tenant_id
    AND p.assigned_branch_id = p_new_branch_id
  LIMIT 1;

  -- Find HSSE officer for new branch
  SELECT p.id INTO v_hsse_officer_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE r.code IN ('hsse_officer', 'hsse_manager')
    AND r.is_active = true
    AND p.tenant_id = v_tenant_id
    AND p.assigned_branch_id = p_new_branch_id
  LIMIT 1;

  -- Update the incident with new branch and approval manager
  UPDATE incidents
  SET 
    branch_id = p_new_branch_id,
    approval_manager_id = COALESCE(v_contractor_consultant_id, v_department_rep_id, v_hsse_officer_id),
    updated_at = now()
  WHERE id = p_incident_id AND event_type = 'observation';

  v_result := jsonb_build_object(
    'success', true,
    'rerouted', true,
    'new_branch_id', p_new_branch_id,
    'approval_manager_id', COALESCE(v_contractor_consultant_id, v_department_rep_id, v_hsse_officer_id)
  );

  RETURN v_result;
END;
$$;

-- 3. Drop and recreate reroute_observation_to_new_site (6-param version)
DROP FUNCTION IF EXISTS public.reroute_observation_to_new_site(uuid, uuid, uuid, uuid, boolean, text);

CREATE OR REPLACE FUNCTION public.reroute_observation_to_new_site(
  p_incident_id uuid,
  p_new_branch_id uuid,
  p_new_site_id uuid,
  p_new_contractor_id uuid,
  p_reset_workflow boolean DEFAULT false,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_contractor_consultant_id uuid;
  v_department_rep_id uuid;
  v_hsse_officer_id uuid;
  v_result jsonb;
BEGIN
  -- Get tenant_id from the incident
  SELECT tenant_id INTO v_tenant_id
  FROM incidents
  WHERE id = p_incident_id AND event_type = 'observation';

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not found');
  END IF;

  -- Find contractor consultant for new branch
  SELECT p.id INTO v_contractor_consultant_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE r.code = 'contractor_consultant'
    AND r.is_active = true
    AND p.tenant_id = v_tenant_id
    AND p.assigned_branch_id = p_new_branch_id
  LIMIT 1;

  -- Find department representative for new branch
  SELECT p.id INTO v_department_rep_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE r.code = 'department_representative'
    AND r.is_active = true
    AND p.tenant_id = v_tenant_id
    AND p.assigned_branch_id = p_new_branch_id
  LIMIT 1;

  -- Find HSSE officer for new branch
  SELECT p.id INTO v_hsse_officer_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE r.code IN ('hsse_officer', 'hsse_manager')
    AND r.is_active = true
    AND p.tenant_id = v_tenant_id
    AND p.assigned_branch_id = p_new_branch_id
  LIMIT 1;

  -- Update the incident with new location and approval manager
  UPDATE incidents
  SET 
    branch_id = p_new_branch_id,
    site_id = p_new_site_id,
    contractor_company_id = COALESCE(p_new_contractor_id, contractor_company_id),
    approval_manager_id = COALESCE(v_contractor_consultant_id, v_department_rep_id, v_hsse_officer_id),
    status = CASE WHEN p_reset_workflow THEN 'pending_dept_rep_approval' ELSE status END,
    updated_at = now()
  WHERE id = p_incident_id AND event_type = 'observation';

  v_result := jsonb_build_object(
    'success', true,
    'rerouted', true,
    'new_branch_id', p_new_branch_id,
    'new_site_id', p_new_site_id,
    'approval_manager_id', COALESCE(v_contractor_consultant_id, v_department_rep_id, v_hsse_officer_id),
    'workflow_reset', p_reset_workflow
  );

  RETURN v_result;
END;
$$;