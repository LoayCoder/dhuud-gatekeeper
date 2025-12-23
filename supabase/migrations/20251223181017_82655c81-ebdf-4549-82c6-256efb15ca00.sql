-- Create function to get incident notification recipients based on matrix rules
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
  was_condition_match BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_site_id UUID;
BEGIN
  -- Get the incident's site_id
  SELECT site_id INTO v_site_id 
  FROM incidents 
  WHERE id = p_incident_id AND deleted_at IS NULL;

  RETURN QUERY
  WITH matrix_rules AS (
    -- Get applicable matrix rules for this severity level
    SELECT 
      inm.id as rule_id,
      inm.stakeholder_role,
      inm.severity_level,
      inm.channels,
      inm.condition_type,
      inm.user_id as specific_user_id,
      inm.tenant_id as rule_tenant_id
    FROM incident_notification_matrix inm
    WHERE inm.is_active = true
      AND inm.deleted_at IS NULL
      AND inm.severity_level = p_severity_level
      AND (inm.tenant_id = p_tenant_id OR inm.tenant_id IS NULL)
  ),
  stakeholder_users AS (
    -- Get users from site_stakeholders for the incident's site
    SELECT 
      ss.user_id,
      ss.stakeholder_type as stakeholder_role
    FROM site_stakeholders ss
    WHERE ss.site_id = v_site_id
      AND ss.is_active = true
      AND ss.deleted_at IS NULL
      AND ss.tenant_id = p_tenant_id
  ),
  role_based_users AS (
    -- Get users by role code (e.g., hsse_manager role)
    SELECT 
      ura.user_id,
      r.code as role_code
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.tenant_id = p_tenant_id
      AND r.is_active = true
  ),
  resolved_users AS (
    -- Resolve users for each matrix rule
    SELECT DISTINCT
      COALESCE(
        mr.specific_user_id,  -- First priority: specific user in matrix
        su.user_id,           -- Second: site stakeholder
        rbu.user_id           -- Third: role-based user
      ) as resolved_user_id,
      mr.stakeholder_role,
      mr.channels,
      mr.condition_type,
      mr.rule_tenant_id
    FROM matrix_rules mr
    LEFT JOIN stakeholder_users su ON LOWER(su.stakeholder_role) = LOWER(mr.stakeholder_role)
    LEFT JOIN role_based_users rbu ON LOWER(rbu.role_code) = LOWER(mr.stakeholder_role)
    WHERE mr.specific_user_id IS NOT NULL 
       OR su.user_id IS NOT NULL 
       OR rbu.user_id IS NOT NULL
  )
  SELECT DISTINCT ON (p.id, ru.stakeholder_role)
    p.id as user_id,
    ru.stakeholder_role,
    ru.channels,
    p.full_name,
    p.phone_number,
    p.email,
    CASE 
      WHEN ru.condition_type = 'has_injury' AND p_has_injury THEN true
      WHEN ru.condition_type = 'erp_activated' AND p_erp_activated THEN true
      WHEN ru.condition_type IS NULL OR ru.condition_type = '' THEN true
      ELSE false
    END as was_condition_match
  FROM resolved_users ru
  JOIN profiles p ON p.id = ru.resolved_user_id
  WHERE p.is_active = true
    AND (p.deleted_at IS NULL OR p.is_deleted = false)
    AND p.tenant_id = p_tenant_id
    AND (
      ru.condition_type IS NULL 
      OR ru.condition_type = ''
      OR (ru.condition_type = 'has_injury' AND p_has_injury)
      OR (ru.condition_type = 'erp_activated' AND p_erp_activated)
    )
  ORDER BY p.id, ru.stakeholder_role, ru.rule_tenant_id NULLS LAST;
END;
$$;