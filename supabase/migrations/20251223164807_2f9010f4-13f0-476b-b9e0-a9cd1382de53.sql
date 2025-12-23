-- Fix the trigger function to properly handle NULL tenant_id
-- and add the upsert function for atomic rule management

-- 1. Drop and recreate the trigger function with proper NULL handling
CREATE OR REPLACE FUNCTION log_notification_matrix_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Get tenant_id, falling back to current user's tenant if NULL
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  
  -- If still NULL, get from current user's profile
  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id 
    FROM profiles 
    WHERE id = auth.uid();
  END IF;
  
  -- Only log if we have a tenant_id (required by security_audit_logs)
  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO security_audit_logs (
      tenant_id, actor_id, action, action_category,
      entity_type, entity_id, result, table_name,
      old_value, new_value, created_at
    ) VALUES (
      v_tenant_id,
      auth.uid(),
      TG_OP,
      'data_change',
      'notification_matrix',
      COALESCE(NEW.id, OLD.id),
      'success',
      'incident_notification_matrix',
      CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
      now()
    );
  END IF;
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create the upsert function for atomic rule management
CREATE OR REPLACE FUNCTION upsert_notification_matrix_rule(
  p_tenant_id uuid,
  p_stakeholder_role text,
  p_severity_level text,
  p_channels text[],
  p_condition_type text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO incident_notification_matrix (
    tenant_id, stakeholder_role, severity_level, channels, condition_type, user_id
  ) VALUES (
    p_tenant_id, p_stakeholder_role, p_severity_level, p_channels, p_condition_type, p_user_id
  )
  ON CONFLICT (tenant_id, stakeholder_role, severity_level) 
  DO UPDATE SET
    channels = EXCLUDED.channels,
    condition_type = EXCLUDED.condition_type,
    user_id = EXCLUDED.user_id,
    deleted_at = NULL
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;