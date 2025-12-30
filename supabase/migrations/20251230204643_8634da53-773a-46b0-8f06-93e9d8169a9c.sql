
-- Step 1: Drop old constraints/indexes properly
ALTER TABLE incident_notification_matrix 
DROP CONSTRAINT IF EXISTS incident_notification_matrix_tenant_id_stakeholder_role_sev_key;

DROP INDEX IF EXISTS idx_notification_matrix_unique_rule;

-- Step 2: Create new unique index that includes event_type
CREATE UNIQUE INDEX idx_notification_matrix_unique_rule 
ON incident_notification_matrix (tenant_id, stakeholder_role, severity_level, event_type, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid))
WHERE deleted_at IS NULL;

-- Step 3: Convert existing 'all' rules to separate 'incident' and 'observation' entries
-- Insert incident-specific copies of 'all' rules
INSERT INTO incident_notification_matrix (
  tenant_id, stakeholder_role, severity_level, channels, event_type, 
  condition_type, user_id, whatsapp_template_id, is_active, created_at
)
SELECT 
  tenant_id, stakeholder_role, severity_level, channels, 'incident',
  condition_type, user_id, whatsapp_template_id, is_active, now()
FROM incident_notification_matrix
WHERE event_type = 'all' AND deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Insert observation-specific copies of 'all' rules
INSERT INTO incident_notification_matrix (
  tenant_id, stakeholder_role, severity_level, channels, event_type, 
  condition_type, user_id, whatsapp_template_id, is_active, created_at
)
SELECT 
  tenant_id, stakeholder_role, severity_level, channels, 'observation',
  condition_type, user_id, whatsapp_template_id, is_active, now()
FROM incident_notification_matrix
WHERE event_type = 'all' AND deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Soft-delete original 'all' entries
UPDATE incident_notification_matrix
SET deleted_at = now()
WHERE event_type = 'all' AND deleted_at IS NULL;

-- Step 4: Update reset_notification_matrix_to_defaults function
CREATE OR REPLACE FUNCTION public.reset_notification_matrix_to_defaults(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_severity text;
  v_event_type text;
  v_channels text[];
BEGIN
  -- Soft-delete existing rules for this tenant
  UPDATE incident_notification_matrix
  SET deleted_at = now()
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;

  -- Loop through both event types
  FOREACH v_event_type IN ARRAY ARRAY['incident', 'observation']
  LOOP
    -- Loop through severity levels
    FOREACH v_severity IN ARRAY ARRAY['level_1', 'level_2', 'level_3', 'level_4', 'level_5']
    LOOP
      -- Determine channels based on severity
      CASE v_severity
        WHEN 'level_1' THEN v_channels := ARRAY['push'];
        WHEN 'level_2' THEN v_channels := ARRAY['push', 'email'];
        WHEN 'level_3' THEN v_channels := ARRAY['push', 'email', 'whatsapp'];
        WHEN 'level_4' THEN v_channels := ARRAY['push', 'email', 'whatsapp'];
        WHEN 'level_5' THEN v_channels := ARRAY['push', 'email', 'whatsapp'];
        ELSE v_channels := ARRAY['push'];
      END CASE;

      -- HSSE Manager
      INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, is_active)
      VALUES (p_tenant_id, 'hsse_manager', v_severity, v_channels, v_event_type, true);

      -- Site Manager
      INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, is_active)
      VALUES (p_tenant_id, 'site_manager', v_severity, v_channels, v_event_type, true);

      -- Area Supervisor
      INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, is_active)
      VALUES (p_tenant_id, 'area_supervisor', v_severity, v_channels, v_event_type, true);

      -- Department Representative
      INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, is_active)
      VALUES (p_tenant_id, 'dept_representative', v_severity, v_channels, v_event_type, true);

      -- Investigation Team - level 3-5 only
      IF v_severity IN ('level_3', 'level_4', 'level_5') THEN
        INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, is_active)
        VALUES (p_tenant_id, 'investigation_team', v_severity, v_channels, v_event_type, true);
      END IF;

      -- Security - level 2-5 only
      IF v_severity IN ('level_2', 'level_3', 'level_4', 'level_5') THEN
        INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, is_active)
        VALUES (p_tenant_id, 'security', v_severity, v_channels, v_event_type, true);
      END IF;

      -- First Aider - incidents only
      IF v_event_type = 'incident' THEN
        INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, condition_type, is_active)
        VALUES (p_tenant_id, 'first_aider', v_severity, v_channels, 'incident', 'has_injury', true);
      END IF;

      -- Clinic Team - incidents only
      IF v_event_type = 'incident' THEN
        INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type, condition_type, is_active)
        VALUES (p_tenant_id, 'clinic_team', v_severity, v_channels, 'incident', 'has_injury', true);
      END IF;

    END LOOP;
  END LOOP;
END;
$$;
