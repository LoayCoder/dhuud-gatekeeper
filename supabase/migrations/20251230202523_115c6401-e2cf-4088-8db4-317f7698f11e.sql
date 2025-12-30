-- Fix 1: Update get_incident_notification_recipients to remove non-existent ura.deleted_at reference
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
  INNER JOIN public.roles r ON r.is_active = TRUE
  INNER JOIN public.user_role_assignments ura ON ura.role_id = r.id AND ura.tenant_id = p_tenant_id
  INNER JOIN public.profiles p ON p.id = ura.user_id
  WHERE 
    (m.tenant_id = p_tenant_id OR m.tenant_id IS NULL)
    AND m.severity_level = p_severity_level
    AND (m.event_type = p_event_type OR m.event_type IS NULL OR m.event_type = 'all')
    AND m.is_active = TRUE
    AND m.deleted_at IS NULL
    AND p.tenant_id = p_tenant_id
    AND p.is_active = TRUE
    AND (p.deleted_at IS NULL)
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
    AND (
      m.condition_type IS NULL
      OR (m.condition_type = 'injury' AND p_has_injury = TRUE)
      OR (m.condition_type = 'erp' AND p_erp_activated = TRUE)
    )
  ORDER BY p.id, m.stakeholder_role, p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: Create reset_notification_matrix_to_defaults RPC function
CREATE OR REPLACE FUNCTION reset_notification_matrix_to_defaults(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  -- Clear existing tenant-specific rules
  DELETE FROM incident_notification_matrix WHERE tenant_id = p_tenant_id;
  
  -- Insert GCC-Standard default notification matrix
  -- Level 1 (Low/Minor)
  INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, is_active)
  VALUES 
    (p_tenant_id, 'hsse_manager', 'level_1', ARRAY['push'], 'all', true),
    (p_tenant_id, 'area_owner', 'level_1', ARRAY['push'], 'all', true);
  
  -- Level 2 (Moderate)
  INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, is_active)
  VALUES 
    (p_tenant_id, 'hsse_manager', 'level_2', ARRAY['push', 'email'], 'all', true),
    (p_tenant_id, 'hsse_expert', 'level_2', ARRAY['push'], 'all', true),
    (p_tenant_id, 'area_owner', 'level_2', ARRAY['push', 'email'], 'all', true),
    (p_tenant_id, 'dept_representative', 'level_2', ARRAY['push', 'email'], 'all', true),
    (p_tenant_id, 'security', 'level_2', ARRAY['push'], 'all', true);
  
  -- Level 3 (Serious)
  INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, is_active)
  VALUES 
    (p_tenant_id, 'hsse_manager', 'level_3', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'hsse_expert', 'level_3', ARRAY['push', 'email'], 'all', true),
    (p_tenant_id, 'area_owner', 'level_3', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'dept_representative', 'level_3', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'bc_team', 'level_3', ARRAY['push', 'email'], 'all', true),
    (p_tenant_id, 'security', 'level_3', ARRAY['push', 'email'], 'all', true),
    (p_tenant_id, 'first_aider', 'level_3', ARRAY['push'], 'incident', true),
    (p_tenant_id, 'clinic_team', 'level_3', ARRAY['push'], 'incident', true);
  
  -- Level 4 (Major)
  INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, is_active)
  VALUES 
    (p_tenant_id, 'hsse_manager', 'level_4', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'hsse_expert', 'level_4', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'area_owner', 'level_4', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'dept_representative', 'level_4', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'bc_team', 'level_4', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'security', 'level_4', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'first_aider', 'level_4', ARRAY['push', 'email'], 'incident', true),
    (p_tenant_id, 'clinic_team', 'level_4', ARRAY['push', 'email'], 'incident', true);
  
  -- Level 5 (Catastrophic)
  INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, is_active)
  VALUES 
    (p_tenant_id, 'hsse_manager', 'level_5', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'hsse_expert', 'level_5', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'area_owner', 'level_5', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'dept_representative', 'level_5', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'bc_team', 'level_5', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'security', 'level_5', ARRAY['push', 'email', 'whatsapp'], 'all', true),
    (p_tenant_id, 'first_aider', 'level_5', ARRAY['push', 'email', 'whatsapp'], 'incident', true),
    (p_tenant_id, 'clinic_team', 'level_5', ARRAY['push', 'email', 'whatsapp'], 'incident', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 3: Update existing empty channel arrays with defaults
UPDATE incident_notification_matrix 
SET channels = ARRAY['push', 'email']
WHERE (channels IS NULL OR channels = '{}')
  AND severity_level IN ('level_2', 'level_3');

UPDATE incident_notification_matrix 
SET channels = ARRAY['push', 'email', 'whatsapp']
WHERE (channels IS NULL OR channels = '{}')
  AND severity_level IN ('level_4', 'level_5');

UPDATE incident_notification_matrix 
SET channels = ARRAY['push']
WHERE (channels IS NULL OR channels = '{}')
  AND severity_level = 'level_1';