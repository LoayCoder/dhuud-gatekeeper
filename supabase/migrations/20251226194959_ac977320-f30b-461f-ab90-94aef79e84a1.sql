-- Drop and recreate the get_incident_notification_recipients function with email_template_id
DROP FUNCTION IF EXISTS public.get_incident_notification_recipients(UUID, UUID, TEXT, BOOLEAN, BOOLEAN);

-- Recreate with updated return type including email_template_id
CREATE OR REPLACE FUNCTION public.get_incident_notification_recipients(
  p_tenant_id UUID,
  p_incident_id UUID,
  p_severity_level TEXT,
  p_has_injury BOOLEAN DEFAULT FALSE,
  p_erp_activated BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  user_id UUID,
  stakeholder_role TEXT,
  channels TEXT[],
  full_name TEXT,
  phone_number TEXT,
  email TEXT,
  preferred_language TEXT,
  was_condition_match BOOLEAN,
  whatsapp_template_id UUID,
  email_template_id UUID,
  matrix_rule_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH incident_data AS (
    SELECT 
      i.site_id,
      i.branch_id
    FROM incidents i
    WHERE i.id = p_incident_id
  ),
  matching_rules AS (
    SELECT 
      m.id as rule_id,
      m.stakeholder_role,
      m.channels,
      m.condition_type,
      m.user_id as specific_user_id,
      m.whatsapp_template_id,
      m.email_template_id,
      CASE 
        WHEN m.condition_type = 'injury' AND p_has_injury THEN TRUE
        WHEN m.condition_type = 'erp_activated' AND p_erp_activated THEN TRUE
        WHEN m.condition_type IS NULL THEN TRUE
        ELSE FALSE
      END as condition_matched
    FROM incident_notification_matrix m
    WHERE (m.tenant_id = p_tenant_id OR m.tenant_id IS NULL)
      AND m.severity_level = p_severity_level
      AND m.deleted_at IS NULL
  )
  SELECT DISTINCT ON (p.id, mr.stakeholder_role)
    p.id as user_id,
    mr.stakeholder_role,
    mr.channels,
    p.full_name,
    p.phone_number,
    p.email,
    COALESCE(p.preferred_language, 'en') as preferred_language,
    mr.condition_matched as was_condition_match,
    mr.whatsapp_template_id,
    mr.email_template_id,
    mr.rule_id as matrix_rule_id
  FROM matching_rules mr
  CROSS JOIN incident_data id
  LEFT JOIN profiles p ON (
    -- If rule specifies a user, match that user
    (mr.specific_user_id IS NOT NULL AND p.id = mr.specific_user_id)
    OR
    -- Otherwise, match by role assignments
    (mr.specific_user_id IS NULL AND EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = p.id
        AND ura.is_active = TRUE
        AND (ura.tenant_id = p_tenant_id OR ura.tenant_id IS NULL)
        AND (
          (mr.stakeholder_role = 'hsse_manager' AND r.name ILIKE '%hsse%manager%')
          OR (mr.stakeholder_role = 'hsse_expert' AND r.name ILIKE '%hsse%expert%')
          OR (mr.stakeholder_role = 'dept_representative' AND r.name ILIKE '%representative%')
          OR (mr.stakeholder_role = 'bc_team' AND r.name ILIKE '%bc%team%')
          OR (mr.stakeholder_role = 'first_aider' AND r.name ILIKE '%first%aid%')
          OR (mr.stakeholder_role = 'clinic_team' AND r.name ILIKE '%clinic%')
          OR (mr.stakeholder_role = 'security' AND r.name ILIKE '%security%')
        )
    ))
    OR
    -- Area Owner: match by site_stakeholders
    (mr.specific_user_id IS NULL AND mr.stakeholder_role = 'area_owner' AND EXISTS (
      SELECT 1 FROM site_stakeholders ss
      WHERE ss.user_id = p.id
        AND ss.site_id = id.site_id
        AND ss.stakeholder_type = 'area_owner'
        AND ss.deleted_at IS NULL
    ))
  )
  WHERE p.id IS NOT NULL
    AND p.is_active = TRUE
    AND p.tenant_id = p_tenant_id
    AND mr.condition_matched = TRUE
  ORDER BY p.id, mr.stakeholder_role, mr.rule_id;
END;
$$;