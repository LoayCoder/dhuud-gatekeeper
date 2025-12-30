-- Fix: Replace get_incident_notification_recipients to resolve roles via user_role_assignments/roles tables
-- The old function incorrectly referenced p.role which doesn't exist on profiles

CREATE OR REPLACE FUNCTION get_incident_notification_recipients(
  p_tenant_id UUID,
  p_severity_level TEXT,
  p_has_injury BOOLEAN DEFAULT FALSE,
  p_erp_activated BOOLEAN DEFAULT FALSE,
  p_event_type TEXT DEFAULT 'incident'
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (p.id, m.stakeholder_role)
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
  FROM public.incident_notification_matrix m
  -- Join through role assignment system
  INNER JOIN public.roles r ON r.is_active = TRUE
  INNER JOIN public.user_role_assignments ura ON ura.role_id = r.id 
    AND ura.tenant_id = p_tenant_id 
    AND ura.deleted_at IS NULL
  INNER JOIN public.profiles p ON p.id = ura.user_id
  WHERE 
    -- Match tenant
    (m.tenant_id = p_tenant_id OR m.tenant_id IS NULL)
    -- Match severity level
    AND m.severity_level = p_severity_level
    -- Match event type
    AND (m.event_type = p_event_type OR m.event_type IS NULL OR m.event_type = 'all')
    -- Active rule
    AND m.is_active = TRUE
    AND m.deleted_at IS NULL
    -- Active user in same tenant
    AND p.tenant_id = p_tenant_id
    AND p.is_active = TRUE
    AND (p.deleted_at IS NULL)
    -- Match stakeholder role to role code (with mapping)
    AND (
      (m.stakeholder_role = 'hsse_manager' AND r.code = 'hsse_manager') OR
      (m.stakeholder_role = 'hsse_expert' AND r.code = 'hsse_expert') OR
      (m.stakeholder_role = 'area_owner' AND r.code IN ('manager', 'hsse_coordinator')) OR
      (m.stakeholder_role = 'dept_representative' AND r.code = 'department_representative') OR
      (m.stakeholder_role = 'bc_team' AND r.code = 'bc_team') OR
      (m.stakeholder_role = 'first_aider' AND r.code = 'first_aider') OR
      (m.stakeholder_role = 'clinic_team' AND r.code = 'clinic_team') OR
      (m.stakeholder_role = 'security' AND r.code IN ('security_guard', 'security_manager', 'security_supervisor'))
    )
    -- Condition matching
    AND (
      m.condition_type IS NULL
      OR (m.condition_type = 'injury' AND p_has_injury = TRUE)
      OR (m.condition_type = 'erp' AND p_erp_activated = TRUE)
    )
  ORDER BY p.id, m.stakeholder_role, p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;