
-- =====================================================
-- PHASE 1: ADD SOFT DELETE COLUMNS TO 5 ASSET TABLES
-- (asset_audit_logs intentionally excluded - audit logs shouldn't be deleted)
-- =====================================================

-- 1. asset_depreciation_schedules
ALTER TABLE public.asset_depreciation_schedules 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. asset_failure_predictions
ALTER TABLE public.asset_failure_predictions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. asset_health_scores
ALTER TABLE public.asset_health_scores 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 4. asset_maintenance_sla_configs
ALTER TABLE public.asset_maintenance_sla_configs 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 5. asset_scan_logs
ALTER TABLE public.asset_scan_logs 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- =====================================================
-- PHASE 1: ADD AUDIT TRIGGERS TO CRITICAL TABLES
-- =====================================================

-- Audit trigger function for asset_cost_transactions
CREATE OR REPLACE FUNCTION public.log_asset_cost_transaction_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO asset_audit_logs (
      asset_id, tenant_id, actor_id, action, old_value, new_value, ip_address
    ) VALUES (
      NEW.asset_id,
      NEW.tenant_id,
      auth.uid(),
      'cost_transaction_updated',
      to_jsonb(OLD),
      to_jsonb(NEW),
      NULL
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO asset_audit_logs (
      asset_id, tenant_id, actor_id, action, old_value, new_value, ip_address
    ) VALUES (
      OLD.asset_id,
      OLD.tenant_id,
      auth.uid(),
      'cost_transaction_deleted',
      to_jsonb(OLD),
      NULL,
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for asset_cost_transactions
DROP TRIGGER IF EXISTS tr_log_cost_transaction_changes ON public.asset_cost_transactions;
CREATE TRIGGER tr_log_cost_transaction_changes
  AFTER UPDATE OR DELETE ON public.asset_cost_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_asset_cost_transaction_changes();

-- Audit trigger function for asset_maintenance_history
CREATE OR REPLACE FUNCTION public.log_asset_maintenance_history_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO asset_audit_logs (
      asset_id, tenant_id, actor_id, action, old_value, new_value, ip_address
    ) VALUES (
      NEW.asset_id,
      NEW.tenant_id,
      auth.uid(),
      'maintenance_history_updated',
      to_jsonb(OLD),
      to_jsonb(NEW),
      NULL
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO asset_audit_logs (
      asset_id, tenant_id, actor_id, action, old_value, new_value, ip_address
    ) VALUES (
      OLD.asset_id,
      OLD.tenant_id,
      auth.uid(),
      'maintenance_history_deleted',
      to_jsonb(OLD),
      NULL,
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for asset_maintenance_history
DROP TRIGGER IF EXISTS tr_log_maintenance_history_changes ON public.asset_maintenance_history;
CREATE TRIGGER tr_log_maintenance_history_changes
  AFTER UPDATE OR DELETE ON public.asset_maintenance_history
  FOR EACH ROW
  EXECUTE FUNCTION public.log_asset_maintenance_history_changes();

-- Audit trigger function for incident_asset_links
CREATE OR REPLACE FUNCTION public.log_incident_asset_link_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO asset_audit_logs (
      asset_id, tenant_id, actor_id, action, old_value, new_value, ip_address
    ) VALUES (
      NEW.asset_id,
      NEW.tenant_id,
      auth.uid(),
      'incident_linked',
      NULL,
      jsonb_build_object('incident_id', NEW.incident_id, 'link_type', NEW.link_type),
      NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO asset_audit_logs (
      asset_id, tenant_id, actor_id, action, old_value, new_value, ip_address
    ) VALUES (
      NEW.asset_id,
      NEW.tenant_id,
      auth.uid(),
      'incident_link_updated',
      to_jsonb(OLD),
      to_jsonb(NEW),
      NULL
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO asset_audit_logs (
      asset_id, tenant_id, actor_id, action, old_value, new_value, ip_address
    ) VALUES (
      OLD.asset_id,
      OLD.tenant_id,
      auth.uid(),
      'incident_unlinked',
      jsonb_build_object('incident_id', OLD.incident_id, 'link_type', OLD.link_type),
      NULL,
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for incident_asset_links
DROP TRIGGER IF EXISTS tr_log_incident_asset_link_changes ON public.incident_asset_links;
CREATE TRIGGER tr_log_incident_asset_link_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.incident_asset_links
  FOR EACH ROW
  EXECUTE FUNCTION public.log_incident_asset_link_changes();

-- =====================================================
-- PHASE 2: TIGHTEN INSERT RLS POLICIES WITH CHECK
-- =====================================================

-- Drop and recreate INSERT policies with proper WITH CHECK clauses

-- asset_cost_transactions
DROP POLICY IF EXISTS "Users can insert cost transactions for their tenant" ON public.asset_cost_transactions;
CREATE POLICY "Users can insert cost transactions for their tenant"
  ON public.asset_cost_transactions
  FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- asset_failure_predictions
DROP POLICY IF EXISTS "Users can insert failure predictions for their tenant" ON public.asset_failure_predictions;
CREATE POLICY "Users can insert failure predictions for their tenant"
  ON public.asset_failure_predictions
  FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- asset_health_scores
DROP POLICY IF EXISTS "Users can insert health scores for their tenant" ON public.asset_health_scores;
CREATE POLICY "Users can insert health scores for their tenant"
  ON public.asset_health_scores
  FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- asset_maintenance_history
DROP POLICY IF EXISTS "Users can insert maintenance history for their tenant" ON public.asset_maintenance_history;
CREATE POLICY "Users can insert maintenance history for their tenant"
  ON public.asset_maintenance_history
  FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- asset_offline_actions
DROP POLICY IF EXISTS "Users can insert offline actions for their tenant" ON public.asset_offline_actions;
CREATE POLICY "Users can insert offline actions for their tenant"
  ON public.asset_offline_actions
  FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- asset_depreciation_schedules
DROP POLICY IF EXISTS "Users can insert depreciation schedules for their tenant" ON public.asset_depreciation_schedules;
CREATE POLICY "Users can insert depreciation schedules for their tenant"
  ON public.asset_depreciation_schedules
  FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- asset_scan_logs
DROP POLICY IF EXISTS "Users can insert scan logs for their tenant" ON public.asset_scan_logs;
CREATE POLICY "Users can insert scan logs for their tenant"
  ON public.asset_scan_logs
  FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- incident_asset_links
DROP POLICY IF EXISTS "Users can insert asset links for their tenant" ON public.incident_asset_links;
CREATE POLICY "Users can insert asset links for their tenant"
  ON public.incident_asset_links
  FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- =====================================================
-- PHASE 2: TIGHTEN UPDATE RLS POLICIES
-- =====================================================

-- asset_cost_transactions
DROP POLICY IF EXISTS "Users can update cost transactions for their tenant" ON public.asset_cost_transactions;
CREATE POLICY "Users can update cost transactions for their tenant"
  ON public.asset_cost_transactions
  FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- asset_failure_predictions
DROP POLICY IF EXISTS "Users can update failure predictions for their tenant" ON public.asset_failure_predictions;
CREATE POLICY "Users can update failure predictions for their tenant"
  ON public.asset_failure_predictions
  FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- asset_health_scores
DROP POLICY IF EXISTS "Users can update health scores for their tenant" ON public.asset_health_scores;
CREATE POLICY "Users can update health scores for their tenant"
  ON public.asset_health_scores
  FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- asset_maintenance_history
DROP POLICY IF EXISTS "Users can update maintenance history for their tenant" ON public.asset_maintenance_history;
CREATE POLICY "Users can update maintenance history for their tenant"
  ON public.asset_maintenance_history
  FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- =====================================================
-- PHASE 2: UPDATE SELECT POLICIES TO FILTER SOFT DELETES
-- =====================================================

-- asset_depreciation_schedules
DROP POLICY IF EXISTS "Users can view depreciation schedules for their tenant" ON public.asset_depreciation_schedules;
CREATE POLICY "Users can view depreciation schedules for their tenant"
  ON public.asset_depreciation_schedules
  FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- asset_failure_predictions
DROP POLICY IF EXISTS "Users can view failure predictions for their tenant" ON public.asset_failure_predictions;
CREATE POLICY "Users can view failure predictions for their tenant"
  ON public.asset_failure_predictions
  FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- asset_health_scores
DROP POLICY IF EXISTS "Users can view health scores for their tenant" ON public.asset_health_scores;
CREATE POLICY "Users can view health scores for their tenant"
  ON public.asset_health_scores
  FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- asset_maintenance_sla_configs
DROP POLICY IF EXISTS "Users can view maintenance SLA configs for their tenant" ON public.asset_maintenance_sla_configs;
CREATE POLICY "Users can view maintenance SLA configs for their tenant"
  ON public.asset_maintenance_sla_configs
  FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- asset_scan_logs
DROP POLICY IF EXISTS "Users can view scan logs for their tenant" ON public.asset_scan_logs;
CREATE POLICY "Users can view scan logs for their tenant"
  ON public.asset_scan_logs
  FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- =====================================================
-- CREATE INDEXES FOR SOFT DELETE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_asset_depreciation_schedules_deleted 
  ON public.asset_depreciation_schedules(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_failure_predictions_deleted 
  ON public.asset_failure_predictions(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_health_scores_deleted 
  ON public.asset_health_scores(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_maintenance_sla_configs_deleted 
  ON public.asset_maintenance_sla_configs(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_scan_logs_deleted 
  ON public.asset_scan_logs(deleted_at) WHERE deleted_at IS NULL;
