
-- Drop and recreate the function with properly aliased email subqueries
DROP FUNCTION IF EXISTS public.get_incident_notification_recipients;

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
    WHERE (nm.tenant_id IS NULL OR nm.tenant_id = p_tenant_id)
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
      END as condition_matched
    FROM matrix_rules mr
    WHERE 
      mr.condition_type IS NULL
      OR (mr.condition_type = 'has_injury' AND p_has_injury = TRUE)
      OR (mr.condition_type = 'erp_activated' AND p_erp_activated = TRUE)
      OR (mr.stakeholder_role != 'first_aider' OR p_has_injury = TRUE)
  ),
  -- Get users for role-based rules (using user_role_assignments + roles tables)
  role_users AS (
    SELECT DISTINCT
      p.id as u_id,
      mr.stakeholder_role as s_role,
      mr.channels as ch,
      p.full_name as f_name,
      p.phone_number as phone,
      au.email as user_email,
      COALESCE(p.preferred_language, 'en') as pref_lang,
      mr.condition_matched as cond_match
    FROM matched_rules mr
    JOIN user_role_assignments ura ON ura.tenant_id = p_tenant_id
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id AND p.tenant_id = p_tenant_id
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE mr.specific_user_id IS NULL
      AND p.deleted_at IS NULL
      AND p.is_active = TRUE
      AND r.is_active = TRUE
      AND (
        -- Map stakeholder roles to role codes
        (mr.stakeholder_role = 'hsse_manager' AND r.code = 'hsse_manager')
        OR (mr.stakeholder_role = 'hsse_expert' AND r.code = 'hsse_expert')
        OR (mr.stakeholder_role = 'hsse_officer' AND r.code = 'hsse_officer')
        OR (mr.stakeholder_role = 'site_manager' AND r.code = 'site_manager')
        OR (mr.stakeholder_role = 'branch_manager' AND r.code = 'branch_manager')
        OR (mr.stakeholder_role = 'department_manager' AND r.code = 'department_manager')
        OR (mr.stakeholder_role = 'first_aider' AND r.code = 'first_aider')
        OR (mr.stakeholder_role = 'security_officer' AND r.code = 'security_officer')
        OR (mr.stakeholder_role = 'top_management' AND r.code IN ('ceo', 'executive'))
        OR (mr.stakeholder_role = 'hr_manager' AND r.code = 'hr_manager')
        OR (mr.stakeholder_role = 'legal_advisor' AND r.code = 'legal_advisor')
        OR (mr.stakeholder_role = 'media_representative' AND r.code = 'media_representative')
        OR (mr.stakeholder_role = 'ehs_technician' AND r.code = 'ehs_technician')
        OR (mr.stakeholder_role = 'area_owner' AND r.code = 'area_owner')
        OR (mr.stakeholder_role = 'admin' AND r.code = 'admin')
      )
  ),
  -- Get users for specific user rules
  specific_users AS (
    SELECT DISTINCT
      p.id as u_id,
      mr.stakeholder_role as s_role,
      mr.channels as ch,
      p.full_name as f_name,
      p.phone_number as phone,
      au.email as user_email,
      COALESCE(p.preferred_language, 'en') as pref_lang,
      mr.condition_matched as cond_match
    FROM matched_rules mr
    JOIN profiles p ON p.id = mr.specific_user_id AND p.tenant_id = p_tenant_id
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE mr.specific_user_id IS NOT NULL
      AND p.deleted_at IS NULL
      AND p.is_active = TRUE
  )
  -- Combine both sets
  SELECT 
    u_id as user_id,
    s_role as stakeholder_role,
    ch as channels,
    f_name as full_name,
    phone as phone_number,
    user_email as email,
    pref_lang as preferred_language,
    cond_match as was_condition_match
  FROM role_users
  UNION
  SELECT 
    u_id as user_id,
    s_role as stakeholder_role,
    ch as channels,
    f_name as full_name,
    phone as phone_number,
    user_email as email,
    pref_lang as preferred_language,
    cond_match as was_condition_match
  FROM specific_users;
END;
$$;
