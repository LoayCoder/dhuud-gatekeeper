-- Fix all three RPC functions with correct field names and table references

-- 1. Fix get_leading_indicators - update field names to match LeadingIndicatorsCard expectations
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

  -- Return with field names matching LeadingIndicatorsCard interface
  RETURN jsonb_build_object(
    'near_miss_rate', v_near_miss_rate,
    'observation_completion_pct', v_observation_rate,
    'action_closure_pct', v_action_closure_rate,
    'hazard_identification_rate', v_hazard_rate,
    'total_near_misses', v_near_misses,
    'total_observations', v_observations_target,
    'closed_observations', v_observations_completed,
    'total_actions', v_actions_due,
    'closed_actions', v_actions_closed,
    'total_hazards', v_hazards_identified,
    'total_hours', v_total_hours,
    'period_start', p_start_date,
    'period_end', p_end_date
  );
END;
$$;

-- 2. Fix get_lagging_indicators - correct table/column references
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
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_total_hours NUMERIC := 0;
    v_recordable_injuries INTEGER := 0;
    v_lost_time_injuries INTEGER := 0;
    v_dart_cases INTEGER := 0;
    v_fatalities INTEGER := 0;
    v_total_lost_workdays INTEGER := 0;
    v_trir NUMERIC := 0;
    v_ltifr NUMERIC := 0;
    v_dart_rate NUMERIC := 0;
    v_fatality_rate NUMERIC := 0;
    v_severity_rate NUMERIC := 0;
BEGIN
    -- Get tenant_id from helper function
    v_tenant_id := get_auth_tenant_id();

    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'total_manhours', 0,
            'total_recordable_injuries', 0,
            'lost_time_injuries', 0,
            'restricted_duty_cases', 0,
            'fatalities', 0,
            'total_lost_days', 0,
            'trir', 0,
            'ltifr', 0,
            'dart_rate', 0,
            'fatality_rate', 0,
            'severity_rate', 0
        );
    END IF;

    -- Get total manhours from manhours table (FIXED: use correct table and column names)
    SELECT COALESCE(SUM(employee_hours + contractor_hours), 0) INTO v_total_hours
    FROM manhours
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND period_date BETWEEN p_start_date AND p_end_date
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_site_id IS NULL OR site_id = p_site_id);

    -- Count incidents by injury classification (FIXED: use occurred_at instead of incident_date)
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
      AND occurred_at BETWEEN p_start_date AND p_end_date
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_site_id IS NULL OR site_id = p_site_id);

    -- Calculate rates (avoid division by zero)
    IF v_total_hours > 0 THEN
        -- TRIR: Total Recordable Incident Rate per 200,000 hours
        v_trir := ROUND((v_recordable_injuries * 200000.0 / v_total_hours)::NUMERIC, 2);
        
        -- LTIFR: Lost Time Injury Frequency Rate per 1,000,000 hours
        v_ltifr := ROUND((v_lost_time_injuries * 1000000.0 / v_total_hours)::NUMERIC, 2);
        
        -- DART Rate: Days Away, Restricted, or Transferred Rate per 200,000 hours
        v_dart_rate := ROUND((v_dart_cases * 200000.0 / v_total_hours)::NUMERIC, 2);
        
        -- Severity Rate: Lost days per 200,000 hours worked
        v_severity_rate := ROUND((v_total_lost_workdays * 200000.0 / v_total_hours)::NUMERIC, 2);

        -- Fatality Rate: per 100,000 workers (estimated from manhours / 2000 hours per worker per year)
        v_fatality_rate := ROUND((v_fatalities * 100000.0 / (v_total_hours / 2000.0))::NUMERIC, 2);
    END IF;

    RETURN jsonb_build_object(
        'total_manhours', v_total_hours,
        'total_recordable_injuries', v_recordable_injuries,
        'lost_time_injuries', v_lost_time_injuries,
        'restricted_duty_cases', v_dart_cases,
        'fatalities', v_fatalities,
        'total_lost_days', v_total_lost_workdays,
        'trir', v_trir,
        'ltifr', v_ltifr,
        'dart_rate', v_dart_rate,
        'fatality_rate', v_fatality_rate,
        'severity_rate', v_severity_rate
    );
END;
$$;

-- 3. Fix get_people_metrics - correct column reference (FIXED: use period_date instead of record_date)
CREATE OR REPLACE FUNCTION public.get_people_metrics(
  p_start_date DATE,
  p_end_date DATE,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_total_manhours NUMERIC;
  v_employee_hours NUMERIC;
  v_contractor_hours NUMERIC;
  v_employee_incidents INTEGER;
  v_contractor_incidents INTEGER;
  v_contractor_ratio NUMERIC;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  -- Get manhours breakdown (FIXED: use period_date instead of record_date)
  SELECT 
    COALESCE(SUM(employee_hours + contractor_hours), 0),
    COALESCE(SUM(employee_hours), 0),
    COALESCE(SUM(contractor_hours), 0)
  INTO v_total_manhours, v_employee_hours, v_contractor_hours
  FROM manhours
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND period_date BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);
  
  -- Get incidents by worker type
  SELECT 
    COUNT(*) FILTER (WHERE worker_type = 'employee' OR worker_type IS NULL),
    COUNT(*) FILTER (WHERE worker_type = 'contractor')
  INTO v_employee_incidents, v_contractor_incidents
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND event_type = 'incident'
    AND occurred_at::date BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);
  
  -- Calculate contractor incident ratio (contractor incidents per 100 contractor hours vs employee incidents per 100 employee hours)
  v_contractor_ratio := CASE 
    WHEN v_employee_hours > 0 AND v_contractor_hours > 0 AND v_employee_incidents > 0 THEN
      ROUND(
        (v_contractor_incidents::numeric / v_contractor_hours * 100) / 
        NULLIF(v_employee_incidents::numeric / v_employee_hours * 100, 0),
        2
      )
    ELSE 0
  END;
  
  RETURN jsonb_build_object(
    'total_manhours', v_total_manhours,
    'employee_hours', v_employee_hours,
    'contractor_hours', v_contractor_hours,
    'employee_incidents', v_employee_incidents,
    'contractor_incidents', v_contractor_incidents,
    'contractor_ratio', COALESCE(v_contractor_ratio, 0),
    'employee_pct', CASE WHEN v_total_manhours > 0 THEN ROUND((v_employee_hours / v_total_manhours) * 100, 1) ELSE 0 END,
    'contractor_pct', CASE WHEN v_total_manhours > 0 THEN ROUND((v_contractor_hours / v_total_manhours) * 100, 1) ELSE 0 END
  );
END;
$$;