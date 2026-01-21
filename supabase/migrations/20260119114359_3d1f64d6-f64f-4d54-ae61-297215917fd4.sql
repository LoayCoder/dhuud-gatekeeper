-- Fix all functions that incorrectly reference p.role (which doesn't exist)
-- The profiles table uses a normalized role structure via user_role_assignments + roles tables

-- 1. Fix auto_route_observation_on_submit() trigger
CREATE OR REPLACE FUNCTION auto_route_observation_on_submit()
RETURNS TRIGGER AS $$
DECLARE
  v_branch_id UUID;
  v_contractor_consultant_id UUID;
  v_dept_rep_id UUID;
  v_is_contractor_related BOOLEAN;
BEGIN
  -- Only process observations
  IF NEW.event_type != 'observation' THEN
    RETURN NEW;
  END IF;
  
  -- Only route when status changes to submitted
  IF NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;

  v_branch_id := NEW.branch_id;
  v_is_contractor_related := (NEW.related_contractor_company_id IS NOT NULL);

  IF v_is_contractor_related THEN
    -- Find contractor consultant for this branch using proper role join
    SELECT p.id INTO v_contractor_consultant_id
    FROM profiles p
    JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.deleted_at IS NULL
    JOIN roles r ON r.id = ura.role_id AND r.deleted_at IS NULL
    WHERE p.assigned_branch_id = v_branch_id
      AND p.tenant_id = NEW.tenant_id
      AND r.code = 'contractor_consultant'
      AND p.deleted_at IS NULL
      AND p.is_active = true
    LIMIT 1;

    IF v_contractor_consultant_id IS NOT NULL THEN
      NEW.approval_manager_id := v_contractor_consultant_id;
      NEW.status := 'pending_dept_rep_approval';
    END IF;
  ELSE
    -- Find department representative for this branch using proper role join
    SELECT p.id INTO v_dept_rep_id
    FROM profiles p
    JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.deleted_at IS NULL
    JOIN roles r ON r.id = ura.role_id AND r.deleted_at IS NULL
    WHERE p.assigned_branch_id = v_branch_id
      AND p.tenant_id = NEW.tenant_id
      AND r.code = 'department_representative'
      AND p.deleted_at IS NULL
      AND p.is_active = true
    LIMIT 1;

    IF v_dept_rep_id IS NOT NULL THEN
      NEW.approval_manager_id := v_dept_rep_id;
      NEW.status := 'pending_dept_rep_approval';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix reroute_observation_to_new_site() function
CREATE OR REPLACE FUNCTION reroute_observation_to_new_site(
  p_incident_id UUID,
  p_new_branch_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_incident RECORD;
  v_new_assigned_to UUID;
  v_is_contractor_related BOOLEAN;
BEGIN
  -- Get the incident details
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id;
  
  IF v_incident IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Check if contractor related
  v_is_contractor_related := (v_incident.related_contractor_company_id IS NOT NULL);
  
  IF v_is_contractor_related THEN
    -- Find contractor consultant using proper role join
    SELECT p.id INTO v_new_assigned_to
    FROM profiles p
    JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.deleted_at IS NULL
    JOIN roles r ON r.id = ura.role_id AND r.deleted_at IS NULL
    WHERE r.code = 'contractor_consultant'
      AND p.tenant_id = v_incident.tenant_id
      AND p.assigned_branch_id = COALESCE(p_new_branch_id, v_incident.branch_id)
      AND p.deleted_at IS NULL
      AND p.is_active = true
    LIMIT 1;
  ELSE
    -- Find department representative using proper role join
    SELECT p.id INTO v_new_assigned_to
    FROM profiles p
    JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.deleted_at IS NULL
    JOIN roles r ON r.id = ura.role_id AND r.deleted_at IS NULL
    WHERE r.code = 'department_representative'
      AND p.tenant_id = v_incident.tenant_id
      AND p.assigned_branch_id = COALESCE(p_new_branch_id, v_incident.branch_id)
      AND p.deleted_at IS NULL
      AND p.is_active = true
    LIMIT 1;
  END IF;
  
  -- Update the incident
  UPDATE incidents
  SET 
    branch_id = COALESCE(p_new_branch_id, branch_id),
    approval_manager_id = COALESCE(v_new_assigned_to, approval_manager_id),
    updated_at = now()
  WHERE id = p_incident_id;
  
  RETURN json_build_object(
    'success', true,
    'new_assigned_to', v_new_assigned_to,
    'new_branch_id', COALESCE(p_new_branch_id, v_incident.branch_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Fix get_emergency_notification_recipients() function
CREATE OR REPLACE FUNCTION get_emergency_notification_recipients(
  p_tenant_id UUID,
  p_branch_id UUID DEFAULT NULL,
  p_alert_type TEXT DEFAULT 'emergency'
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role_code TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id AS user_id,
    p.full_name,
    p.email,
    p.phone,
    r.code AS role_code
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.deleted_at IS NULL
  JOIN roles r ON r.id = ura.role_id AND r.deleted_at IS NULL
  WHERE p.tenant_id = p_tenant_id
    AND p.deleted_at IS NULL
    AND p.is_active = true
    AND r.code IN (
      'admin',
      'tenant_admin', 
      'hsse_manager',
      'hsse_officer',
      'security_manager',
      'security_supervisor',
      'security_officer',
      'emergency_coordinator'
    )
    AND (
      p_branch_id IS NULL 
      OR p.assigned_branch_id = p_branch_id 
      OR r.code IN ('admin', 'tenant_admin', 'hsse_manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;