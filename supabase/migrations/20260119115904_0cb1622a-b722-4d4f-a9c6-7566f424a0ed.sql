-- Fix: Replace all report_type references with event_type (the actual column name)

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
  -- FIX: Use event_type instead of report_type
  IF NEW.event_type != 'observation' OR NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;

  v_branch_id := NEW.branch_id;
  v_site_id := NEW.site_id;

  -- Find contractor consultant for this branch/site
  SELECT p.id INTO v_contractor_consultant_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE p.tenant_id = NEW.tenant_id
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND r.code = 'contractor_consultant'
    AND r.is_active = true
    AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
    AND (ura.site_id = v_site_id OR ura.site_id IS NULL)
  ORDER BY 
    CASE WHEN ura.site_id = v_site_id THEN 0 ELSE 1 END,
    CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Find department rep for this branch/site
  SELECT p.id INTO v_department_rep_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE p.tenant_id = NEW.tenant_id
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND r.code = 'department_rep'
    AND r.is_active = true
    AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
    AND (ura.site_id = v_site_id OR ura.site_id IS NULL)
  ORDER BY 
    CASE WHEN ura.site_id = v_site_id THEN 0 ELSE 1 END,
    CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Find HSSE officer for this branch
  SELECT p.id INTO v_hsse_officer_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE p.tenant_id = NEW.tenant_id
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND r.code = 'hsse_officer'
    AND r.is_active = true
    AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
  ORDER BY 
    CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Update the observation with assigned personnel
  UPDATE incidents
  SET 
    contractor_consultant_id = v_contractor_consultant_id,
    department_rep_id = v_department_rep_id,
    assigned_investigator_id = v_hsse_officer_id,
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
  -- Get tenant_id and verify it's an observation
  SELECT tenant_id INTO v_tenant_id
  FROM incidents
  WHERE id = p_incident_id AND event_type = 'observation';  -- FIX: Use event_type

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not found');
  END IF;

  -- Find contractor consultant for the new branch
  SELECT p.id INTO v_contractor_consultant_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE p.tenant_id = v_tenant_id
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND r.code = 'contractor_consultant'
    AND r.is_active = true
    AND (ura.branch_id = p_new_branch_id OR ura.branch_id IS NULL)
  ORDER BY 
    CASE WHEN ura.branch_id = p_new_branch_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Find department rep for the new branch
  SELECT p.id INTO v_department_rep_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE p.tenant_id = v_tenant_id
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND r.code = 'department_rep'
    AND r.is_active = true
    AND (ura.branch_id = p_new_branch_id OR ura.branch_id IS NULL)
  ORDER BY 
    CASE WHEN ura.branch_id = p_new_branch_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Find HSSE officer for the new branch
  SELECT p.id INTO v_hsse_officer_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE p.tenant_id = v_tenant_id
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND r.code = 'hsse_officer'
    AND r.is_active = true
    AND (ura.branch_id = p_new_branch_id OR ura.branch_id IS NULL)
  ORDER BY 
    CASE WHEN ura.branch_id = p_new_branch_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Update the observation
  UPDATE incidents
  SET 
    branch_id = p_new_branch_id,
    contractor_consultant_id = v_contractor_consultant_id,
    department_rep_id = v_department_rep_id,
    assigned_investigator_id = v_hsse_officer_id,
    updated_at = now()
  WHERE id = p_incident_id;

  v_result := jsonb_build_object(
    'success', true,
    'rerouted', true,
    'new_branch_id', p_new_branch_id,
    'contractor_consultant_id', v_contractor_consultant_id,
    'department_rep_id', v_department_rep_id,
    'hsse_officer_id', v_hsse_officer_id
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
  p_should_reroute boolean,
  p_admin_notes text
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
  -- Get tenant_id and verify it's an observation
  SELECT tenant_id INTO v_tenant_id
  FROM incidents
  WHERE id = p_incident_id AND event_type = 'observation';  -- FIX: Use event_type

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not found');
  END IF;

  -- If not rerouting, just update contractor and notes
  IF NOT p_should_reroute THEN
    UPDATE incidents
    SET 
      contractor_company_id = COALESCE(p_new_contractor_id, contractor_company_id),
      admin_notes = p_admin_notes,
      updated_at = now()
    WHERE id = p_incident_id;

    RETURN jsonb_build_object(
      'success', true,
      'rerouted', false,
      'contractor_updated', p_new_contractor_id IS NOT NULL
    );
  END IF;

  -- Find contractor consultant for the new branch/site
  SELECT p.id INTO v_contractor_consultant_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE p.tenant_id = v_tenant_id
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND r.code = 'contractor_consultant'
    AND r.is_active = true
    AND (p.assigned_branch_id = p_new_branch_id OR p.assigned_branch_id IS NULL)
  ORDER BY 
    CASE WHEN p.assigned_branch_id = p_new_branch_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Find department rep for the new branch/site
  SELECT p.id INTO v_department_rep_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE p.tenant_id = v_tenant_id
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND r.code = 'department_rep'
    AND r.is_active = true
    AND (ura.branch_id = p_new_branch_id OR ura.branch_id IS NULL)
  ORDER BY 
    CASE WHEN ura.branch_id = p_new_branch_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Find HSSE officer for the new branch
  SELECT p.id INTO v_hsse_officer_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE p.tenant_id = v_tenant_id
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND r.code = 'hsse_officer'
    AND r.is_active = true
    AND (ura.branch_id = p_new_branch_id OR ura.branch_id IS NULL)
  ORDER BY 
    CASE WHEN ura.branch_id = p_new_branch_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Update the observation with new routing
  UPDATE incidents
  SET 
    branch_id = p_new_branch_id,
    site_id = p_new_site_id,
    contractor_company_id = COALESCE(p_new_contractor_id, contractor_company_id),
    contractor_consultant_id = v_contractor_consultant_id,
    department_rep_id = v_department_rep_id,
    assigned_investigator_id = v_hsse_officer_id,
    admin_notes = p_admin_notes,
    updated_at = now()
  WHERE id = p_incident_id;

  v_result := jsonb_build_object(
    'success', true,
    'rerouted', true,
    'new_branch_id', p_new_branch_id,
    'new_site_id', p_new_site_id,
    'contractor_consultant_id', v_contractor_consultant_id,
    'department_rep_id', v_department_rep_id,
    'hsse_officer_id', v_hsse_officer_id
  );

  RETURN v_result;
END;
$$;