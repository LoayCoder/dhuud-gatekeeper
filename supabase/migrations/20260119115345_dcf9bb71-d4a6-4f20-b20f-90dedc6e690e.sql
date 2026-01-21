-- ============================================================================
-- CRITICAL FIX: Remove all invalid column references
-- Drop ALL affected functions first to avoid return type conflicts
-- ============================================================================

-- Drop all affected functions first
DROP FUNCTION IF EXISTS public.get_emergency_notification_recipients(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.get_emergency_notification_recipients(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.reopen_closed_incident(uuid, text);
DROP FUNCTION IF EXISTS public.reroute_observation_to_new_site(uuid, uuid);
DROP FUNCTION IF EXISTS public.reroute_observation_to_new_site(uuid, uuid, uuid, uuid, boolean, text);
DROP FUNCTION IF EXISTS public.has_confidentiality_access(uuid, uuid);

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
  -- Only process observations in 'submitted' status
  IF NEW.report_type != 'observation' OR NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;

  v_branch_id := NEW.branch_id;
  v_site_id := NEW.site_id;

  -- Try to find contractor consultant for the branch
  SELECT p.id INTO v_contractor_consultant_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id AND r.is_active = true
  WHERE p.assigned_branch_id = v_branch_id
    AND p.tenant_id = NEW.tenant_id
    AND r.code = 'contractor_consultant'
    AND p.deleted_at IS NULL
    AND p.is_active = true
  LIMIT 1;

  -- If no contractor consultant, try department representative
  IF v_contractor_consultant_id IS NULL THEN
    SELECT p.id INTO v_department_rep_id
    FROM profiles p
    JOIN user_role_assignments ura ON ura.user_id = p.id
    JOIN roles r ON r.id = ura.role_id AND r.is_active = true
    WHERE p.assigned_branch_id = v_branch_id
      AND p.tenant_id = NEW.tenant_id
      AND r.code = 'department_representative'
      AND p.deleted_at IS NULL
      AND p.is_active = true
    LIMIT 1;
  END IF;

  -- If no department rep, try HSSE officer
  IF v_contractor_consultant_id IS NULL AND v_department_rep_id IS NULL THEN
    SELECT p.id INTO v_hsse_officer_id
    FROM profiles p
    JOIN user_role_assignments ura ON ura.user_id = p.id
    JOIN roles r ON r.id = ura.role_id AND r.is_active = true
    WHERE p.assigned_branch_id = v_branch_id
      AND p.tenant_id = NEW.tenant_id
      AND r.code = 'hsse_officer'
      AND p.deleted_at IS NULL
      AND p.is_active = true
    LIMIT 1;
  END IF;

  -- Assign to the first available person
  NEW.assigned_to := COALESCE(v_contractor_consultant_id, v_department_rep_id, v_hsse_officer_id);
  
  -- Update status to under_review if assigned
  IF NEW.assigned_to IS NOT NULL THEN
    NEW.status := 'under_review';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Recreate get_emergency_notification_recipients (branch version)
CREATE FUNCTION public.get_emergency_notification_recipients(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_alert_type text
)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  phone_number text,
  preferred_language text,
  role_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id as user_id,
    p.full_name,
    p.email,
    p.phone_number,
    COALESCE(p.preferred_language, 'en') as preferred_language,
    r.code as role_code
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id AND r.is_active = true
  WHERE p.tenant_id = p_tenant_id
    AND p.deleted_at IS NULL
    AND p.is_active = true
    AND (
      p.assigned_branch_id = p_branch_id
      OR r.code IN ('admin', 'super_admin', 'hsse_manager', 'security_manager')
    )
    AND r.code IN (
      'admin', 'super_admin', 'hsse_manager', 'hsse_officer',
      'security_manager', 'security_supervisor', 'security_officer',
      'department_head', 'branch_manager'
    );
END;
$$;

-- 3. Recreate get_emergency_notification_recipients (site version)
CREATE FUNCTION public.get_emergency_notification_recipients(
  p_tenant_id uuid,
  p_alert_type text,
  p_site_id uuid
)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  phone_number text,
  preferred_language text,
  role_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id as user_id,
    p.full_name,
    p.email,
    p.phone_number,
    COALESCE(p.preferred_language, 'en') as preferred_language,
    r.code as role_code
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id AND r.is_active = true
  WHERE p.tenant_id = p_tenant_id
    AND p.deleted_at IS NULL
    AND p.is_active = true
    AND (
      p.assigned_site_id = p_site_id
      OR r.code IN ('admin', 'super_admin', 'hsse_manager', 'security_manager')
    )
    AND r.code IN (
      'admin', 'super_admin', 'hsse_manager', 'hsse_officer',
      'security_manager', 'security_supervisor', 'security_officer',
      'department_head', 'branch_manager', 'site_supervisor'
    );
END;
$$;

-- 4. Recreate has_confidentiality_access function
CREATE FUNCTION public.has_confidentiality_access(
  _incident_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access boolean := false;
  v_incident_tenant_id uuid;
  v_user_tenant_id uuid;
BEGIN
  -- Get incident tenant
  SELECT tenant_id INTO v_incident_tenant_id
  FROM incidents
  WHERE id = _incident_id;

  -- Get user tenant
  SELECT tenant_id INTO v_user_tenant_id
  FROM profiles
  WHERE id = _user_id AND deleted_at IS NULL;

  -- Must be same tenant
  IF v_incident_tenant_id IS NULL OR v_user_tenant_id IS NULL OR v_incident_tenant_id != v_user_tenant_id THEN
    RETURN false;
  END IF;

  -- Check if user has privileged role (NO deleted_at on ura or roles)
  SELECT EXISTS(
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id AND r.is_active = true
    WHERE ura.user_id = _user_id
      AND r.code IN ('admin', 'super_admin', 'hsse_manager', 'legal_officer', 'hr_manager')
  ) INTO v_has_access;

  -- Also check if user is the reporter or assigned investigator
  IF NOT v_has_access THEN
    SELECT EXISTS(
      SELECT 1
      FROM incidents i
      WHERE i.id = _incident_id
        AND (i.reported_by = _user_id OR i.assigned_to = _user_id)
    ) INTO v_has_access;
  END IF;

  RETURN v_has_access;
END;
$$;

-- 5. Recreate reopen_closed_incident function
CREATE FUNCTION public.reopen_closed_incident(
  p_incident_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident record;
  v_user_id uuid;
  v_can_reopen boolean := false;
BEGIN
  v_user_id := auth.uid();
  
  -- Get incident details
  SELECT * INTO v_incident
  FROM incidents
  WHERE id = p_incident_id;

  IF v_incident IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Incident not found');
  END IF;

  IF v_incident.status != 'closed' THEN
    RETURN json_build_object('success', false, 'error', 'Incident is not closed');
  END IF;

  -- Check if user has permission to reopen (NO deleted_at on ura)
  SELECT EXISTS(
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id AND r.is_active = true
    WHERE ura.user_id = v_user_id
      AND r.code IN ('admin', 'super_admin', 'hsse_manager')
  ) INTO v_can_reopen;

  IF NOT v_can_reopen THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  -- Reopen the incident
  UPDATE incidents
  SET 
    status = 'investigation',
    reopened_at = now(),
    reopened_by = v_user_id,
    reopen_reason = p_reason,
    updated_at = now()
  WHERE id = p_incident_id;

  RETURN json_build_object('success', true, 'message', 'Incident reopened successfully');
END;
$$;

-- 6. Recreate reroute_observation_to_new_site (2-param version)
CREATE FUNCTION public.reroute_observation_to_new_site(
  p_incident_id uuid,
  p_new_branch_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident record;
  v_new_assigned_to uuid;
BEGIN
  -- Get incident details
  SELECT * INTO v_incident
  FROM incidents
  WHERE id = p_incident_id AND report_type = 'observation';

  IF v_incident IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Observation not found');
  END IF;

  -- Find new contractor consultant for the new branch (NO deleted_at on ura, use assigned_branch_id)
  SELECT p.id INTO v_new_assigned_to
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id AND r.is_active = true
  WHERE r.code = 'contractor_consultant'
    AND p.tenant_id = v_incident.tenant_id
    AND p.assigned_branch_id = COALESCE(p_new_branch_id, v_incident.branch_id)
    AND p.deleted_at IS NULL
    AND p.is_active = true
  LIMIT 1;

  -- Update the observation
  UPDATE incidents
  SET 
    branch_id = COALESCE(p_new_branch_id, branch_id),
    assigned_to = v_new_assigned_to,
    updated_at = now()
  WHERE id = p_incident_id;

  RETURN json_build_object('success', true, 'new_assigned_to', v_new_assigned_to);
END;
$$;

-- 7. Recreate reroute_observation_to_new_site (6-param version)
CREATE FUNCTION public.reroute_observation_to_new_site(
  p_incident_id uuid,
  p_new_branch_id uuid,
  p_new_site_id uuid,
  p_new_contractor_id uuid,
  p_should_reroute boolean,
  p_admin_notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident record;
  v_new_assigned_to uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Get incident details
  SELECT * INTO v_incident
  FROM incidents
  WHERE id = p_incident_id AND report_type = 'observation';

  IF v_incident IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Observation not found');
  END IF;

  -- If specific contractor provided, use that
  IF p_new_contractor_id IS NOT NULL THEN
    v_new_assigned_to := p_new_contractor_id;
  ELSIF p_should_reroute THEN
    -- Find contractor consultant for the new branch/site (NO deleted_at on ura, use assigned_branch_id)
    SELECT p.id INTO v_new_assigned_to
    FROM profiles p
    JOIN user_role_assignments ura ON ura.user_id = p.id
    JOIN roles r ON r.id = ura.role_id AND r.is_active = true
    WHERE r.code = 'contractor_consultant'
      AND p.tenant_id = v_incident.tenant_id
      AND p.assigned_branch_id = COALESCE(p_new_branch_id, v_incident.branch_id)
      AND (p_new_site_id IS NULL OR p.assigned_site_id = p_new_site_id)
      AND p.deleted_at IS NULL
      AND p.is_active = true
    LIMIT 1;
  END IF;

  -- Update the observation
  UPDATE incidents
  SET 
    branch_id = COALESCE(p_new_branch_id, branch_id),
    site_id = COALESCE(p_new_site_id, site_id),
    assigned_to = COALESCE(v_new_assigned_to, assigned_to),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    rerouted_at = CASE WHEN p_should_reroute THEN now() ELSE rerouted_at END,
    rerouted_by = CASE WHEN p_should_reroute THEN v_user_id ELSE rerouted_by END,
    updated_at = now()
  WHERE id = p_incident_id;

  RETURN json_build_object(
    'success', true, 
    'new_assigned_to', v_new_assigned_to,
    'rerouted', p_should_reroute
  );
END;
$$;