-- Drop and recreate function with correct table name
DROP FUNCTION IF EXISTS public.get_incident_notification_recipients(UUID, UUID, TEXT, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_incident_notification_recipients(
  p_tenant_id UUID,
  p_incident_id UUID,
  p_severity_level TEXT,
  p_has_injury BOOLEAN DEFAULT FALSE,
  p_erp_activated BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  user_id UUID,
  stakeholder_role TEXT,
  channels TEXT[],
  full_name TEXT,
  phone_number TEXT,
  email TEXT,
  preferred_language TEXT,
  was_condition_match BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_site_id UUID;
  v_incident_branch_id UUID;
  severity_level_num INT;
BEGIN
  -- Map severity level string to number
  severity_level_num := CASE p_severity_level
    WHEN 'level_1' THEN 1
    WHEN 'level_2' THEN 2
    WHEN 'level_3' THEN 3
    WHEN 'level_4' THEN 4
    WHEN 'level_5' THEN 5
    ELSE 2
  END;

  -- Get incident location for branch filtering
  SELECT site_id, branch_id INTO v_incident_site_id, v_incident_branch_id
  FROM incidents
  WHERE id = p_incident_id AND tenant_id = p_tenant_id;

  RETURN QUERY
  WITH matrix_rules AS (
    -- Get all matching rules from incident_notification_matrix
    SELECT 
      nm.id,
      nm.stakeholder_role,
      nm.channels,
      nm.severity_level as rule_severity,
      nm.condition_type,
      nm.user_id as specific_user_id
    FROM incident_notification_matrix nm
    WHERE nm.tenant_id = p_tenant_id
      AND nm.is_active = TRUE
      AND nm.deleted_at IS NULL
      AND (
        nm.severity_level IS NULL 
        OR nm.severity_level = p_severity_level
        OR (nm.severity_level = 'level_3' AND severity_level_num >= 3)
        OR (nm.severity_level = 'level_4' AND severity_level_num >= 4)
        OR (nm.severity_level = 'level_5' AND severity_level_num >= 5)
      )
  ),
  matched_rules AS (
    -- Apply condition matching
    SELECT 
      mr.*,
      CASE 
        WHEN mr.condition_type IS NULL THEN FALSE
        WHEN mr.condition_type = 'has_injury' AND p_has_injury = TRUE THEN TRUE
        WHEN mr.condition_type = 'erp_activated' AND p_erp_activated = TRUE THEN TRUE
        ELSE FALSE
      END as was_condition_match
    FROM matrix_rules mr
    WHERE 
      -- Either no conditions, or conditions match
      mr.condition_type IS NULL
      OR (mr.condition_type = 'has_injury' AND p_has_injury = TRUE)
      OR (mr.condition_type = 'erp_activated' AND p_erp_activated = TRUE)
      -- First aiders only notified when there's an injury
      OR (mr.stakeholder_role != 'first_aider' OR p_has_injury = TRUE)
  ),
  -- Get users for role-based rules
  role_users AS (
    SELECT DISTINCT
      p.id as user_id,
      mr.stakeholder_role,
      mr.channels,
      p.full_name,
      p.phone_number,
      p.email,
      COALESCE(p.preferred_language, 'en') as preferred_language,
      mr.was_condition_match
    FROM matched_rules mr
    CROSS JOIN profiles p
    WHERE mr.specific_user_id IS NULL  -- Only role-based rules
      AND p.tenant_id = p_tenant_id
      AND p.deleted_at IS NULL
      AND p.is_active = TRUE
      AND (
        -- Map stakeholder roles to user roles
        (mr.stakeholder_role = 'hsse_manager' AND p.role = 'hsse_manager')
        OR (mr.stakeholder_role = 'hsse_expert' AND p.role = 'hsse_expert')
        OR (mr.stakeholder_role = 'hsse_officer' AND p.role = 'hsse_officer')
        OR (mr.stakeholder_role = 'site_manager' AND p.role = 'site_manager')
        OR (mr.stakeholder_role = 'branch_manager' AND p.role = 'branch_manager')
        OR (mr.stakeholder_role = 'department_manager' AND p.role = 'department_manager')
        OR (mr.stakeholder_role = 'first_aider' AND p.role = 'first_aider')
        OR (mr.stakeholder_role = 'security_officer' AND p.role = 'security_officer')
        OR (mr.stakeholder_role = 'top_management' AND p.role IN ('ceo', 'executive'))
        OR (mr.stakeholder_role = 'hr_manager' AND p.role = 'hr_manager')
        OR (mr.stakeholder_role = 'legal_advisor' AND p.role = 'legal_advisor')
        OR (mr.stakeholder_role = 'media_representative' AND p.role = 'media_representative')
        OR (mr.stakeholder_role = 'ehs_technician' AND p.role = 'ehs_technician')
      )
  ),
  -- Get users for specific user rules
  specific_users AS (
    SELECT DISTINCT
      p.id as user_id,
      mr.stakeholder_role,
      mr.channels,
      p.full_name,
      p.phone_number,
      p.email,
      COALESCE(p.preferred_language, 'en') as preferred_language,
      mr.was_condition_match
    FROM matched_rules mr
    JOIN profiles p ON p.id = mr.specific_user_id
    WHERE mr.specific_user_id IS NOT NULL
      AND p.tenant_id = p_tenant_id
      AND p.deleted_at IS NULL
      AND p.is_active = TRUE
  ),
  -- Combine role and specific users
  all_users AS (
    SELECT * FROM role_users
    UNION
    SELECT * FROM specific_users
  )
  SELECT 
    au.user_id,
    au.stakeholder_role,
    au.channels,
    au.full_name,
    au.phone_number,
    au.email,
    au.preferred_language,
    au.was_condition_match
  FROM all_users au;
END;
$$;