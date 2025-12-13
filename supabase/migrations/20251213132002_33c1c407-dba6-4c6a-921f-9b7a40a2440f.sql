-- =============================================
-- PHASE 1: HSSE KPI Dashboard Schema Enhancements
-- =============================================

-- 1. Create manhours table for tracking employee/contractor hours
CREATE TABLE public.manhours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  period_date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  employee_hours NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (employee_hours >= 0),
  contractor_hours NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (contractor_hours >= 0),
  branch_id UUID REFERENCES public.branches(id),
  site_id UUID REFERENCES public.sites(id),
  department_id UUID REFERENCES public.departments(id),
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, period_date, period_type, branch_id, site_id, department_id)
);

-- Enable RLS on manhours
ALTER TABLE public.manhours ENABLE ROW LEVEL SECURITY;

-- RLS policies for manhours
CREATE POLICY "Users can view manhours in their tenant"
  ON public.manhours FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Admins can manage manhours"
  ON public.manhours FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = get_auth_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_manhours_updated_at
  BEFORE UPDATE ON public.manhours
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create kpi_targets table for configurable thresholds
CREATE TABLE public.kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  kpi_code TEXT NOT NULL CHECK (kpi_code IN (
    'trir', 'ltifr', 'dart', 'fatality_rate', 'severity_rate',
    'near_miss_rate', 'observation_rate', 'action_closure_rate',
    'training_completion', 'hazard_rate', 'investigation_target_days'
  )),
  target_value NUMERIC(10,4) NOT NULL,
  warning_threshold NUMERIC(10,4),
  critical_threshold NUMERIC(10,4),
  period_type TEXT DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, kpi_code, effective_from)
);

-- Enable RLS on kpi_targets
ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;

-- RLS policies for kpi_targets
CREATE POLICY "Users can view KPI targets in their tenant"
  ON public.kpi_targets FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Admins can manage KPI targets"
  ON public.kpi_targets FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = get_auth_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_kpi_targets_updated_at
  BEFORE UPDATE ON public.kpi_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add injury classification columns to incidents table
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS injury_classification TEXT CHECK (injury_classification IN (
    'fatality', 'lost_time', 'restricted_work', 'medical_treatment', 'first_aid', 'none'
  )),
  ADD COLUMN IF NOT EXISTS lost_workdays INTEGER DEFAULT 0 CHECK (lost_workdays >= 0),
  ADD COLUMN IF NOT EXISTS restricted_workdays INTEGER DEFAULT 0 CHECK (restricted_workdays >= 0),
  ADD COLUMN IF NOT EXISTS is_recordable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS worker_type TEXT CHECK (worker_type IN ('employee', 'contractor', 'visitor', 'other'));

-- 4. Create RPC function to get total manhours for a period
CREATE OR REPLACE FUNCTION public.get_manhours_summary(
  p_start_date DATE,
  p_end_date DATE,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL,
  p_department_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_employee_hours NUMERIC,
  total_contractor_hours NUMERIC,
  total_hours NUMERIC,
  record_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(m.employee_hours), 0)::NUMERIC as total_employee_hours,
    COALESCE(SUM(m.contractor_hours), 0)::NUMERIC as total_contractor_hours,
    COALESCE(SUM(m.employee_hours + m.contractor_hours), 0)::NUMERIC as total_hours,
    COUNT(*)::BIGINT as record_count
  FROM manhours m
  WHERE m.tenant_id = get_auth_tenant_id()
    AND m.deleted_at IS NULL
    AND m.period_date >= p_start_date
    AND m.period_date <= p_end_date
    AND (p_branch_id IS NULL OR m.branch_id = p_branch_id)
    AND (p_site_id IS NULL OR m.site_id = p_site_id)
    AND (p_department_id IS NULL OR m.department_id = p_department_id);
END;
$$;

-- 5. Create RPC function to get lagging indicators
CREATE OR REPLACE FUNCTION public.get_lagging_indicators(
  p_start_date DATE,
  p_end_date DATE,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_total_hours NUMERIC;
  v_recordable_injuries INTEGER;
  v_lost_time_injuries INTEGER;
  v_dart_cases INTEGER;
  v_fatalities INTEGER;
  v_total_lost_workdays INTEGER;
  v_trir NUMERIC;
  v_ltifr NUMERIC;
  v_dart_rate NUMERIC;
  v_fatality_rate NUMERIC;
  v_severity_rate NUMERIC;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  -- Get total manhours
  SELECT COALESCE(SUM(employee_hours + contractor_hours), 0)
  INTO v_total_hours
  FROM manhours
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND period_date >= p_start_date
    AND period_date <= p_end_date
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Get incident counts
  SELECT 
    COUNT(*) FILTER (WHERE is_recordable = true),
    COUNT(*) FILTER (WHERE injury_classification = 'lost_time'),
    COUNT(*) FILTER (WHERE injury_classification IN ('lost_time', 'restricted_work')),
    COUNT(*) FILTER (WHERE injury_classification = 'fatality'),
    COALESCE(SUM(lost_workdays), 0)
  INTO v_recordable_injuries, v_lost_time_injuries, v_dart_cases, v_fatalities, v_total_lost_workdays
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND has_injury = true
    AND occurred_at >= p_start_date
    AND occurred_at <= p_end_date
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Calculate rates (avoid division by zero)
  IF v_total_hours > 0 THEN
    v_trir := ROUND((v_recordable_injuries * 200000.0 / v_total_hours)::NUMERIC, 2);
    v_ltifr := ROUND((v_lost_time_injuries * 1000000.0 / v_total_hours)::NUMERIC, 2);
    v_dart_rate := ROUND((v_dart_cases * 200000.0 / v_total_hours)::NUMERIC, 2);
    v_fatality_rate := ROUND((v_fatalities * 200000.0 / v_total_hours)::NUMERIC, 4);
    v_severity_rate := ROUND((v_total_lost_workdays * 200000.0 / v_total_hours)::NUMERIC, 2);
  ELSE
    v_trir := 0;
    v_ltifr := 0;
    v_dart_rate := 0;
    v_fatality_rate := 0;
    v_severity_rate := 0;
  END IF;

  RETURN jsonb_build_object(
    'total_hours', v_total_hours,
    'recordable_injuries', v_recordable_injuries,
    'lost_time_injuries', v_lost_time_injuries,
    'dart_cases', v_dart_cases,
    'fatalities', v_fatalities,
    'total_lost_workdays', v_total_lost_workdays,
    'trir', v_trir,
    'ltifr', v_ltifr,
    'dart_rate', v_dart_rate,
    'fatality_rate', v_fatality_rate,
    'severity_rate', v_severity_rate,
    'period_start', p_start_date,
    'period_end', p_end_date
  );
END;
$$;

-- 6. Create RPC function to get leading indicators
CREATE OR REPLACE FUNCTION public.get_leading_indicators(
  p_start_date DATE,
  p_end_date DATE,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_total_hours NUMERIC;
  v_near_misses INTEGER;
  v_observations_completed INTEGER;
  v_observations_target INTEGER;
  v_actions_closed INTEGER;
  v_actions_due INTEGER;
  v_hazards_identified INTEGER;
  v_near_miss_rate NUMERIC;
  v_observation_rate NUMERIC;
  v_action_closure_rate NUMERIC;
  v_hazard_rate NUMERIC;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  -- Get total manhours
  SELECT COALESCE(SUM(employee_hours + contractor_hours), 0)
  INTO v_total_hours
  FROM manhours
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND period_date >= p_start_date
    AND period_date <= p_end_date
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Count near misses
  SELECT COUNT(*)
  INTO v_near_misses
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND subtype = 'near_miss'
    AND occurred_at >= p_start_date
    AND occurred_at <= p_end_date
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Count observations (from inspection_sessions)
  SELECT COUNT(*)
  INTO v_observations_completed
  FROM inspection_sessions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND status IN ('completed_with_open_actions', 'closed')
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  -- Get observation target from kpi_targets (default 100)
  SELECT COALESCE(target_value, 100)
  INTO v_observations_target
  FROM kpi_targets
  WHERE tenant_id = v_tenant_id
    AND kpi_code = 'observation_rate'
    AND deleted_at IS NULL
    AND effective_from <= p_end_date
    AND (effective_to IS NULL OR effective_to >= p_start_date)
  ORDER BY effective_from DESC
  LIMIT 1;

  IF v_observations_target IS NULL THEN
    v_observations_target := 100;
  END IF;

  -- Count corrective actions
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('verified', 'closed')),
    COUNT(*) FILTER (WHERE due_date <= p_end_date)
  INTO v_actions_closed, v_actions_due
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  -- Count hazards identified (observations with unsafe_condition)
  SELECT COUNT(*)
  INTO v_hazards_identified
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND event_type = 'observation'
    AND subtype = 'unsafe_condition'
    AND occurred_at >= p_start_date
    AND occurred_at <= p_end_date
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Calculate rates
  IF v_total_hours > 0 THEN
    v_near_miss_rate := ROUND((v_near_misses * 200000.0 / v_total_hours)::NUMERIC, 2);
    v_hazard_rate := ROUND((v_hazards_identified * 200000.0 / v_total_hours)::NUMERIC, 2);
  ELSE
    v_near_miss_rate := 0;
    v_hazard_rate := 0;
  END IF;

  v_observation_rate := CASE WHEN v_observations_target > 0 
    THEN ROUND((v_observations_completed * 100.0 / v_observations_target)::NUMERIC, 1)
    ELSE 0 END;

  v_action_closure_rate := CASE WHEN v_actions_due > 0
    THEN ROUND((v_actions_closed * 100.0 / v_actions_due)::NUMERIC, 1)
    ELSE 100 END;

  RETURN jsonb_build_object(
    'total_hours', v_total_hours,
    'near_misses', v_near_misses,
    'near_miss_rate', v_near_miss_rate,
    'observations_completed', v_observations_completed,
    'observations_target', v_observations_target,
    'observation_rate', v_observation_rate,
    'actions_closed', v_actions_closed,
    'actions_due', v_actions_due,
    'action_closure_rate', v_action_closure_rate,
    'hazards_identified', v_hazards_identified,
    'hazard_rate', v_hazard_rate,
    'period_start', p_start_date,
    'period_end', p_end_date
  );
END;
$$;