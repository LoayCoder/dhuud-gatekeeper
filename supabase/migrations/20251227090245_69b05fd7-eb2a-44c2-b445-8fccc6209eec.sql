-- =====================================================
-- PHASE 1: Asset Cost Tracking & TCO Analysis
-- =====================================================

-- Asset cost transactions for all cost types
CREATE TABLE public.asset_cost_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.hsse_assets(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'maintenance', 'repair', 'upgrade', 'energy', 'insurance', 'disposal', 'other')),
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  transaction_date DATE NOT NULL,
  description TEXT,
  vendor_name TEXT,
  invoice_number TEXT,
  maintenance_schedule_id UUID REFERENCES public.asset_maintenance_schedules(id),
  fiscal_year INTEGER,
  fiscal_quarter INTEGER CHECK (fiscal_quarter BETWEEN 1 AND 4),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Pre-calculated depreciation schedules
CREATE TABLE public.asset_depreciation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.hsse_assets(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  opening_value DECIMAL(15,2) NOT NULL,
  depreciation_amount DECIMAL(15,2) NOT NULL,
  closing_value DECIMAL(15,2) NOT NULL,
  accumulated_depreciation DECIMAL(15,2) NOT NULL,
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- PHASE 2: Offline Actions Queue
-- =====================================================

-- Offline actions queue for mobile scanning
CREATE TABLE public.asset_offline_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  asset_id UUID REFERENCES public.hsse_assets(id),
  asset_code TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('inspection', 'condition_update', 'maintenance_log', 'transfer', 'scan_log', 'photo_upload')),
  action_data JSONB NOT NULL DEFAULT '{}',
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  gps_accuracy DECIMAL(10,2),
  captured_at TIMESTAMPTZ NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'conflict')),
  sync_error TEXT,
  synced_at TIMESTAMPTZ,
  conflict_data JSONB,
  resolution_strategy TEXT CHECK (resolution_strategy IN ('client_wins', 'server_wins', 'manual', 'merged')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- PHASE 3: AI Predictive Maintenance
-- =====================================================

-- Detailed maintenance history for AI analysis
CREATE TABLE public.asset_maintenance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.hsse_assets(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.asset_maintenance_schedules(id),
  maintenance_type TEXT NOT NULL,
  performed_date TIMESTAMPTZ NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  planned_duration_hours DECIMAL(5,2),
  actual_duration_hours DECIMAL(5,2),
  cost DECIMAL(15,2),
  currency TEXT DEFAULT 'SAR',
  parts_used JSONB DEFAULT '[]',
  findings JSONB DEFAULT '{}',
  notes TEXT,
  condition_before TEXT CHECK (condition_before IN ('excellent', 'good', 'fair', 'poor', 'critical')),
  condition_after TEXT CHECK (condition_after IN ('excellent', 'good', 'fair', 'poor', 'critical')),
  failure_mode TEXT,
  root_cause TEXT,
  next_recommended_action TEXT,
  was_unplanned BOOLEAN DEFAULT FALSE,
  downtime_hours DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- AI-calculated health scores
CREATE TABLE public.asset_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.hsse_assets(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  failure_probability DECIMAL(5,2) CHECK (failure_probability BETWEEN 0 AND 100),
  days_until_predicted_failure INTEGER,
  contributing_factors JSONB DEFAULT '{}',
  maintenance_compliance_pct DECIMAL(5,2),
  age_factor DECIMAL(5,2),
  condition_factor DECIMAL(5,2),
  usage_factor DECIMAL(5,2),
  environment_factor DECIMAL(5,2),
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining', 'critical_decline')),
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculation_model_version TEXT DEFAULT 'v1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(asset_id)
);

-- AI failure predictions
CREATE TABLE public.asset_failure_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.hsse_assets(id) ON DELETE CASCADE,
  predicted_failure_type TEXT NOT NULL,
  predicted_date DATE NOT NULL,
  confidence_pct DECIMAL(5,2) NOT NULL CHECK (confidence_pct BETWEEN 0 AND 100),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  recommended_action TEXT,
  estimated_repair_cost DECIMAL(15,2),
  cost_if_ignored DECIMAL(15,2),
  priority INTEGER CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'addressed', 'dismissed', 'occurred', 'false_positive')),
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMPTZ,
  addressed_at TIMESTAMPTZ,
  actual_failure_date DATE,
  prediction_model_version TEXT DEFAULT 'v1.0',
  model_inputs JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE public.asset_cost_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_depreciation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_offline_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_failure_predictions ENABLE ROW LEVEL SECURITY;

-- Cost transactions policies
CREATE POLICY "Users can view cost transactions in their tenant"
  ON public.asset_cost_transactions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert cost transactions in their tenant"
  ON public.asset_cost_transactions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update cost transactions in their tenant"
  ON public.asset_cost_transactions FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Depreciation schedules policies
CREATE POLICY "Users can view depreciation schedules in their tenant"
  ON public.asset_depreciation_schedules FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert depreciation schedules in their tenant"
  ON public.asset_depreciation_schedules FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Offline actions policies
CREATE POLICY "Users can view offline actions in their tenant"
  ON public.asset_offline_actions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert offline actions in their tenant"
  ON public.asset_offline_actions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update offline actions in their tenant"
  ON public.asset_offline_actions FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Maintenance history policies
CREATE POLICY "Users can view maintenance history in their tenant"
  ON public.asset_maintenance_history FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert maintenance history in their tenant"
  ON public.asset_maintenance_history FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update maintenance history in their tenant"
  ON public.asset_maintenance_history FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Health scores policies
CREATE POLICY "Users can view health scores in their tenant"
  ON public.asset_health_scores FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert health scores in their tenant"
  ON public.asset_health_scores FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update health scores in their tenant"
  ON public.asset_health_scores FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Failure predictions policies
CREATE POLICY "Users can view failure predictions in their tenant"
  ON public.asset_failure_predictions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert failure predictions in their tenant"
  ON public.asset_failure_predictions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update failure predictions in their tenant"
  ON public.asset_failure_predictions FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- =====================================================
-- Indexes for performance
-- =====================================================

CREATE INDEX idx_cost_transactions_asset ON public.asset_cost_transactions(asset_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cost_transactions_tenant_date ON public.asset_cost_transactions(tenant_id, transaction_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_cost_transactions_type ON public.asset_cost_transactions(transaction_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_cost_transactions_fiscal ON public.asset_cost_transactions(fiscal_year, fiscal_quarter) WHERE deleted_at IS NULL;

CREATE INDEX idx_depreciation_schedules_asset ON public.asset_depreciation_schedules(asset_id);
CREATE INDEX idx_depreciation_schedules_period ON public.asset_depreciation_schedules(period_start, period_end);

CREATE INDEX idx_offline_actions_device ON public.asset_offline_actions(device_id, sync_status);
CREATE INDEX idx_offline_actions_asset ON public.asset_offline_actions(asset_id);
CREATE INDEX idx_offline_actions_pending ON public.asset_offline_actions(tenant_id, sync_status) WHERE sync_status IN ('pending', 'failed');

CREATE INDEX idx_maintenance_history_asset ON public.asset_maintenance_history(asset_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_history_date ON public.asset_maintenance_history(performed_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_history_unplanned ON public.asset_maintenance_history(asset_id, was_unplanned) WHERE deleted_at IS NULL;

CREATE INDEX idx_health_scores_asset ON public.asset_health_scores(asset_id);
CREATE INDEX idx_health_scores_risk ON public.asset_health_scores(tenant_id, risk_level);
CREATE INDEX idx_health_scores_score ON public.asset_health_scores(score);

CREATE INDEX idx_failure_predictions_asset ON public.asset_failure_predictions(asset_id);
CREATE INDEX idx_failure_predictions_active ON public.asset_failure_predictions(tenant_id, status, predicted_date) WHERE status = 'active';
CREATE INDEX idx_failure_predictions_priority ON public.asset_failure_predictions(priority, severity) WHERE status = 'active';

-- =====================================================
-- Database function for depreciation calculation
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_asset_depreciation(p_asset_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_purchase_price DECIMAL(15,2);
  v_salvage_value DECIMAL(15,2);
  v_lifespan_years INTEGER;
  v_installation_date DATE;
  v_depreciation_method TEXT;
  v_months_elapsed INTEGER;
  v_monthly_depreciation DECIMAL(15,2);
  v_total_depreciation DECIMAL(15,2);
  v_current_value DECIMAL(15,2);
BEGIN
  SELECT 
    purchase_price,
    COALESCE(salvage_value, 0),
    COALESCE(lifespan_years, 10),
    installation_date,
    COALESCE(depreciation_method, 'straight_line')
  INTO v_purchase_price, v_salvage_value, v_lifespan_years, v_installation_date, v_depreciation_method
  FROM public.hsse_assets
  WHERE id = p_asset_id AND deleted_at IS NULL;
  
  IF v_purchase_price IS NULL OR v_installation_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_months_elapsed := EXTRACT(YEAR FROM age(CURRENT_DATE, v_installation_date)) * 12 
                    + EXTRACT(MONTH FROM age(CURRENT_DATE, v_installation_date));
  
  IF v_depreciation_method = 'straight_line' THEN
    v_monthly_depreciation := (v_purchase_price - v_salvage_value) / (v_lifespan_years * 12);
    v_total_depreciation := LEAST(v_monthly_depreciation * v_months_elapsed, v_purchase_price - v_salvage_value);
  ELSIF v_depreciation_method = 'declining_balance' THEN
    v_current_value := v_purchase_price * POWER(1 - (2.0 / v_lifespan_years), v_months_elapsed / 12.0);
    v_total_depreciation := v_purchase_price - GREATEST(v_current_value, v_salvage_value);
  ELSE
    v_monthly_depreciation := (v_purchase_price - v_salvage_value) / (v_lifespan_years * 12);
    v_total_depreciation := LEAST(v_monthly_depreciation * v_months_elapsed, v_purchase_price - v_salvage_value);
  END IF;
  
  v_current_value := v_purchase_price - v_total_depreciation;
  
  UPDATE public.hsse_assets 
  SET current_book_value = v_current_value,
      updated_at = now()
  WHERE id = p_asset_id;
  
  RETURN v_current_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- TCO Summary View
-- =====================================================

CREATE OR REPLACE VIEW public.asset_tco_summary AS
SELECT 
  a.id AS asset_id,
  a.tenant_id,
  a.asset_code,
  a.name,
  a.purchase_price AS acquisition_cost,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'maintenance' THEN ct.amount END), 0) AS maintenance_cost,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'repair' THEN ct.amount END), 0) AS repair_cost,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'energy' THEN ct.amount END), 0) AS energy_cost,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'insurance' THEN ct.amount END), 0) AS insurance_cost,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'upgrade' THEN ct.amount END), 0) AS upgrade_cost,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'other' THEN ct.amount END), 0) AS other_cost,
  COALESCE(a.purchase_price, 0) + COALESCE(SUM(ct.amount), 0) AS total_cost_of_ownership,
  EXTRACT(YEAR FROM age(CURRENT_DATE, a.installation_date)) * 12 
    + EXTRACT(MONTH FROM age(CURRENT_DATE, a.installation_date)) AS months_in_service,
  CASE 
    WHEN a.installation_date IS NOT NULL AND 
         EXTRACT(YEAR FROM age(CURRENT_DATE, a.installation_date)) * 12 + EXTRACT(MONTH FROM age(CURRENT_DATE, a.installation_date)) > 0
    THEN (COALESCE(a.purchase_price, 0) + COALESCE(SUM(ct.amount), 0)) / 
         (EXTRACT(YEAR FROM age(CURRENT_DATE, a.installation_date)) * 12 + EXTRACT(MONTH FROM age(CURRENT_DATE, a.installation_date)))
    ELSE 0
  END AS cost_per_month
FROM public.hsse_assets a
LEFT JOIN public.asset_cost_transactions ct ON a.id = ct.asset_id AND ct.deleted_at IS NULL
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.tenant_id, a.asset_code, a.name, a.purchase_price, a.installation_date;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_health_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_failure_predictions;