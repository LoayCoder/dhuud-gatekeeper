-- Update upsert_notification_matrix_rule to support whatsapp_template_id
CREATE OR REPLACE FUNCTION public.upsert_notification_matrix_rule(
  p_tenant_id UUID,
  p_stakeholder_role TEXT,
  p_severity_level TEXT,
  p_channels TEXT[],
  p_condition_type TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_whatsapp_template_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule_id UUID;
BEGIN
  INSERT INTO incident_notification_matrix (
    tenant_id, stakeholder_role, severity_level, channels, 
    condition_type, user_id, whatsapp_template_id
  )
  VALUES (
    p_tenant_id, p_stakeholder_role, p_severity_level, p_channels,
    p_condition_type, p_user_id, p_whatsapp_template_id
  )
  ON CONFLICT (tenant_id, stakeholder_role, severity_level) 
  WHERE user_id IS NULL AND deleted_at IS NULL
  DO UPDATE SET
    channels = EXCLUDED.channels,
    condition_type = EXCLUDED.condition_type,
    whatsapp_template_id = EXCLUDED.whatsapp_template_id,
    updated_at = NOW()
  RETURNING id INTO v_rule_id;
  
  RETURN v_rule_id;
END;
$$;