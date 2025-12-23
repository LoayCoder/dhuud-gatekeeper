-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS public.get_incident_notification_recipients(UUID, UUID, TEXT, BOOLEAN, BOOLEAN);

-- Recreate function with preferred_language in return
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
    -- Get all matching rules from notification matrix
    SELECT 
      nm.id,
      nm.stakeholder_role,
      nm.channels,
      nm.branches,
      nm.min_severity,
      nm.conditions
    FROM notification_matrix nm
    WHERE nm.tenant_id = p_tenant_id
      AND nm.is_active = TRUE
      AND nm.deleted_at IS NULL
      AND nm.event_type = 'incident_created'
      AND (
        nm.min_severity IS NULL 
        OR severity_level_num >= nm.min_severity
      )
  ),
  matched_rules AS (
    -- Apply condition matching
    SELECT 
      mr.*,
      CASE 
        WHEN mr.conditions IS NULL THEN FALSE
        WHEN mr.conditions ? 'has_injury' AND p_has_injury = TRUE THEN TRUE
        WHEN mr.conditions ? 'erp_activated' AND p_erp_activated = TRUE THEN TRUE
        ELSE FALSE
      END as was_condition_match
    FROM matrix_rules mr
    WHERE 
      -- Either no conditions, or conditions match
      mr.conditions IS NULL
      OR mr.conditions = '{}'::jsonb
      OR (mr.conditions ? 'has_injury' AND p_has_injury = TRUE)
      OR (mr.conditions ? 'erp_activated' AND p_erp_activated = TRUE)
      -- First aiders only notified when there's an injury
      OR (mr.stakeholder_role != 'first_aider' OR p_has_injury = TRUE)
  ),
  role_users AS (
    -- Get users who match the stakeholder roles
    SELECT DISTINCT
      p.id as user_id,
      mr.stakeholder_role,
      mr.channels,
      p.full_name,
      p.phone_number,
      p.email,
      COALESCE(p.preferred_language, 'en') as preferred_language,
      mr.was_condition_match,
      mr.branches
    FROM matched_rules mr
    CROSS JOIN profiles p
    WHERE p.tenant_id = p_tenant_id
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
  )
  SELECT 
    ru.user_id,
    ru.stakeholder_role,
    ru.channels,
    ru.full_name,
    ru.phone_number,
    ru.email,
    ru.preferred_language,
    ru.was_condition_match
  FROM role_users ru
  WHERE 
    -- Branch filtering: null branches means all, otherwise check if incident branch matches
    ru.branches IS NULL 
    OR ru.branches = '[]'::jsonb
    OR (v_incident_branch_id IS NOT NULL AND ru.branches ? v_incident_branch_id::text)
    -- Also include if user's branch matches
    OR EXISTS (
      SELECT 1 FROM profiles p2 
      WHERE p2.id = ru.user_id 
        AND (p2.branch_id IS NULL OR p2.branch_id = v_incident_branch_id)
    );
END;
$$;