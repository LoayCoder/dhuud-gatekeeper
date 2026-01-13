-- =====================================================
-- ENTERPRISE SECURITY & AUDIT ENHANCEMENT
-- =====================================================

-- 1. Create unified audit_logs table for HSSA compliance
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  who_id uuid NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  description text,
  metadata jsonb DEFAULT '{}',
  timestamp timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_timestamp 
  ON audit_logs(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
  ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_who 
  ON audit_logs(who_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
  ON audit_logs(tenant_id, action_type, timestamp DESC);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit_logs
CREATE POLICY "tenant_isolation_audit_logs" ON audit_logs
  FOR ALL USING (tenant_id = get_auth_tenant_id());

-- 2. Create audit logging helper function with proper search_path
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
  v_audit_id uuid;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := get_auth_tenant_id();
  
  IF v_user_id IS NULL OR v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO audit_logs (
    tenant_id, who_id, action_type, entity_type, entity_id,
    old_value, new_value, description, metadata
  ) VALUES (
    v_tenant_id, v_user_id, p_action_type, p_entity_type, p_entity_id,
    p_old_value, p_new_value, p_description, p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- 3. Create audit trigger function with proper search_path
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM log_audit('DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), NULL, 
      'Record deleted from ' || TG_TABLE_NAME);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
      PERFORM log_audit('UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW),
        'Record updated in ' || TG_TABLE_NAME);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM log_audit('CREATE', TG_TABLE_NAME, NEW.id, NULL, to_jsonb(NEW),
      'Record created in ' || TG_TABLE_NAME);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- 4. Add audit triggers to confirmed existing tables
DROP TRIGGER IF EXISTS audit_incidents_trigger ON incidents;
CREATE TRIGGER audit_incidents_trigger
  AFTER INSERT OR UPDATE OR DELETE ON incidents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_inspection_sessions_trigger ON inspection_sessions;
CREATE TRIGGER audit_inspection_sessions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON inspection_sessions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_hsse_assets_trigger ON hsse_assets;
CREATE TRIGGER audit_hsse_assets_trigger
  AFTER INSERT OR UPDATE OR DELETE ON hsse_assets
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_profiles_trigger ON profiles;
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_corrective_actions_trigger ON corrective_actions;
CREATE TRIGGER audit_corrective_actions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON corrective_actions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_gate_entry_logs_trigger ON gate_entry_logs;
CREATE TRIGGER audit_gate_entry_logs_trigger
  AFTER INSERT OR UPDATE OR DELETE ON gate_entry_logs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 5. Performance indexes for key tables
CREATE INDEX IF NOT EXISTS idx_incidents_tenant_status_date 
  ON incidents(tenant_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inspection_sessions_tenant_status
  ON inspection_sessions(tenant_id, status, started_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_corrective_actions_tenant_status_due
  ON corrective_actions(tenant_id, status, due_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gate_entry_logs_tenant_date
  ON gate_entry_logs(tenant_id, entry_time DESC)
  WHERE deleted_at IS NULL;