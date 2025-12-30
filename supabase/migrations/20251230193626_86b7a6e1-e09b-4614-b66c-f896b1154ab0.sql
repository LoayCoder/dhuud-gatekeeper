-- Fix: Update get_incident_notification_recipients to accept TEXT severity_level
-- The incident_notification_matrix.severity_level column is TEXT (e.g., 'level_1', 'level_2')
-- So the parameter must also be TEXT for proper comparison

DROP FUNCTION IF EXISTS get_incident_notification_recipients(uuid, integer, boolean, boolean, text);

CREATE OR REPLACE FUNCTION get_incident_notification_recipients(
  p_tenant_id UUID,
  p_severity_level TEXT,  -- Changed from INTEGER to TEXT to match column type
  p_has_injury BOOLEAN DEFAULT FALSE,
  p_erp_activated BOOLEAN DEFAULT FALSE,
  p_event_type TEXT DEFAULT 'incident'
)
RETURNS TABLE (
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id AS user_id,
    m.stakeholder_role,
    m.channels,
    p.full_name,
    p.phone_number,
    p.email,
    COALESCE(p.preferred_language, 'ar') AS preferred_language,
    CASE 
      WHEN m.condition_type = 'injury' AND p_has_injury THEN TRUE
      WHEN m.condition_type = 'erp' AND p_erp_activated THEN TRUE
      WHEN m.condition_type IS NULL THEN TRUE
      ELSE FALSE
    END AS was_condition_match,
    m.whatsapp_template_id,
    m.email_template_id,
    m.id AS matrix_rule_id
  FROM incident_notification_matrix m
  INNER JOIN profiles p ON (
    -- Match stakeholder role to profile role or designation
    (m.stakeholder_role = 'hsse_manager' AND p.role = 'hsse_manager') OR
    (m.stakeholder_role = 'hsse_expert' AND p.role = 'hsse_expert') OR
    (m.stakeholder_role = 'area_owner' AND p.role = 'area_owner') OR
    (m.stakeholder_role = 'dept_representative' AND p.role = 'dept_representative') OR
    (m.stakeholder_role = 'bc_team' AND p.role = 'bc_team') OR
    (m.stakeholder_role = 'first_aider' AND p.role = 'first_aider') OR
    (m.stakeholder_role = 'clinic_team' AND p.role = 'clinic_team') OR
    (m.stakeholder_role = 'security' AND p.role = 'security') OR
    (m.stakeholder_role = p.role)
  )
  WHERE 
    -- Match tenant (or global rules where tenant_id is null)
    (m.tenant_id = p_tenant_id OR m.tenant_id IS NULL)
    -- Match severity level (now TEXT = TEXT comparison)
    AND m.severity_level = p_severity_level
    -- Match event type
    AND (m.event_type = p_event_type OR m.event_type IS NULL OR m.event_type = 'all')
    -- Rule must be active
    AND m.is_active = TRUE
    AND m.deleted_at IS NULL
    -- Profile must be active and same tenant
    AND p.tenant_id = p_tenant_id
    AND p.is_active = TRUE
    AND p.deleted_at IS NULL
    -- Apply condition filtering
    AND (
      m.condition_type IS NULL
      OR (m.condition_type = 'injury' AND p_has_injury = TRUE)
      OR (m.condition_type = 'erp' AND p_erp_activated = TRUE)
    )
  ORDER BY m.stakeholder_role, p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;