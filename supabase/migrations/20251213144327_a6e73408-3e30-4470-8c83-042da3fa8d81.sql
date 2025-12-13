
-- RPC: Get KPI historical trend data for sparklines (last 12 months)
CREATE OR REPLACE FUNCTION public.get_kpi_historical_trend(
  p_start_date DATE DEFAULT (NOW() - INTERVAL '12 months')::DATE,
  p_end_date DATE DEFAULT NOW()::DATE,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS TABLE (
  month DATE,
  trir NUMERIC,
  ltifr NUMERIC,
  dart NUMERIC,
  severity_rate NUMERIC,
  near_miss_rate NUMERIC,
  action_closure_pct NUMERIC,
  total_incidents INTEGER,
  total_manhours NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  RETURN QUERY
  WITH monthly_incidents AS (
    SELECT 
      DATE_TRUNC('month', i.occurred_at)::DATE AS month,
      COUNT(*) FILTER (WHERE i.event_type = 'incident') AS incident_count,
      COUNT(*) FILTER (WHERE i.injury_classification IN ('medical_treatment', 'lost_time', 'fatality', 'first_aid')) AS recordable_injuries,
      COUNT(*) FILTER (WHERE i.injury_classification = 'lost_time') AS lost_time_injuries,
      COUNT(*) FILTER (WHERE i.injury_classification IN ('lost_time', 'restricted_duty')) AS dart_cases,
      COALESCE(SUM(i.lost_days), 0) AS total_lost_days,
      COUNT(*) FILTER (WHERE i.event_type = 'observation' AND i.sub_type = 'near_miss') AS near_miss_count
    FROM incidents i
    WHERE i.tenant_id = v_tenant_id
      AND i.deleted_at IS NULL
      AND i.occurred_at >= p_start_date
      AND i.occurred_at <= p_end_date
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
    GROUP BY DATE_TRUNC('month', i.occurred_at)
  ),
  monthly_manhours AS (
    SELECT 
      DATE_TRUNC('month', m.period_start)::DATE AS month,
      COALESCE(SUM(m.employee_hours + m.contractor_hours), 0) AS total_hours
    FROM manhours_records m
    WHERE m.tenant_id = v_tenant_id
      AND m.deleted_at IS NULL
      AND m.period_start >= p_start_date
      AND m.period_start <= p_end_date
      AND (p_branch_id IS NULL OR m.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR m.site_id = p_site_id)
    GROUP BY DATE_TRUNC('month', m.period_start)
  ),
  monthly_actions AS (
    SELECT 
      DATE_TRUNC('month', ca.created_at)::DATE AS month,
      COUNT(*) AS total_actions,
      COUNT(*) FILTER (WHERE ca.status IN ('verified', 'closed')) AS closed_actions
    FROM corrective_actions ca
    WHERE ca.tenant_id = v_tenant_id
      AND ca.deleted_at IS NULL
      AND ca.created_at >= p_start_date
      AND ca.created_at <= p_end_date
    GROUP BY DATE_TRUNC('month', ca.created_at)
  ),
  all_months AS (
    SELECT generate_series(
      DATE_TRUNC('month', p_start_date)::DATE,
      DATE_TRUNC('month', p_end_date)::DATE,
      '1 month'::INTERVAL
    )::DATE AS month
  )
  SELECT 
    am.month,
    CASE 
      WHEN COALESCE(mh.total_hours, 0) > 0 
      THEN ROUND((COALESCE(mi.recordable_injuries, 0)::NUMERIC * 200000) / mh.total_hours, 2)
      ELSE 0
    END AS trir,
    CASE 
      WHEN COALESCE(mh.total_hours, 0) > 0 
      THEN ROUND((COALESCE(mi.lost_time_injuries, 0)::NUMERIC * 1000000) / mh.total_hours, 2)
      ELSE 0
    END AS ltifr,
    CASE 
      WHEN COALESCE(mh.total_hours, 0) > 0 
      THEN ROUND((COALESCE(mi.dart_cases, 0)::NUMERIC * 200000) / mh.total_hours, 2)
      ELSE 0
    END AS dart,
    CASE 
      WHEN COALESCE(mh.total_hours, 0) > 0 
      THEN ROUND((COALESCE(mi.total_lost_days, 0)::NUMERIC * 200000) / mh.total_hours, 2)
      ELSE 0
    END AS severity_rate,
    CASE 
      WHEN COALESCE(mi.incident_count, 0) > 0 
      THEN ROUND((COALESCE(mi.near_miss_count, 0)::NUMERIC * 100) / mi.incident_count, 1)
      ELSE 0
    END AS near_miss_rate,
    CASE 
      WHEN COALESCE(ma.total_actions, 0) > 0 
      THEN ROUND((COALESCE(ma.closed_actions, 0)::NUMERIC * 100) / ma.total_actions, 1)
      ELSE 0
    END AS action_closure_pct,
    COALESCE(mi.incident_count, 0)::INTEGER AS total_incidents,
    COALESCE(mh.total_hours, 0) AS total_manhours
  FROM all_months am
  LEFT JOIN monthly_incidents mi ON mi.month = am.month
  LEFT JOIN monthly_manhours mh ON mh.month = am.month
  LEFT JOIN monthly_actions ma ON ma.month = am.month
  ORDER BY am.month;
END;
$$;

-- RPC: Get KPI period comparison (current vs previous period)
CREATE OR REPLACE FUNCTION public.get_kpi_period_comparison(
  p_current_start DATE,
  p_current_end DATE,
  p_previous_start DATE,
  p_previous_end DATE,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS TABLE (
  metric_name TEXT,
  current_value NUMERIC,
  previous_value NUMERIC,
  percent_change NUMERIC,
  trend_direction TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_current_trir NUMERIC;
  v_previous_trir NUMERIC;
  v_current_ltifr NUMERIC;
  v_previous_ltifr NUMERIC;
  v_current_dart NUMERIC;
  v_previous_dart NUMERIC;
  v_current_severity NUMERIC;
  v_previous_severity NUMERIC;
  v_current_near_miss NUMERIC;
  v_previous_near_miss NUMERIC;
  v_current_action_closure NUMERIC;
  v_previous_action_closure NUMERIC;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  -- Calculate current period metrics
  WITH current_data AS (
    SELECT 
      COUNT(*) FILTER (WHERE i.injury_classification IN ('medical_treatment', 'lost_time', 'fatality', 'first_aid')) AS recordable,
      COUNT(*) FILTER (WHERE i.injury_classification = 'lost_time') AS lti,
      COUNT(*) FILTER (WHERE i.injury_classification IN ('lost_time', 'restricted_duty')) AS dart,
      COALESCE(SUM(i.lost_days), 0) AS lost_days,
      COUNT(*) FILTER (WHERE i.event_type = 'observation' AND i.sub_type = 'near_miss') AS near_miss,
      COUNT(*) FILTER (WHERE i.event_type = 'incident') AS incidents
    FROM incidents i
    WHERE i.tenant_id = v_tenant_id
      AND i.deleted_at IS NULL
      AND i.occurred_at >= p_current_start
      AND i.occurred_at <= p_current_end
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
  ),
  current_hours AS (
    SELECT COALESCE(SUM(m.employee_hours + m.contractor_hours), 0) AS hours
    FROM manhours_records m
    WHERE m.tenant_id = v_tenant_id
      AND m.deleted_at IS NULL
      AND m.period_start >= p_current_start
      AND m.period_start <= p_current_end
      AND (p_branch_id IS NULL OR m.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR m.site_id = p_site_id)
  ),
  current_actions AS (
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status IN ('verified', 'closed')) AS closed
    FROM corrective_actions
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND created_at >= p_current_start
      AND created_at <= p_current_end
  )
  SELECT 
    CASE WHEN ch.hours > 0 THEN ROUND((cd.recordable::NUMERIC * 200000) / ch.hours, 2) ELSE 0 END,
    CASE WHEN ch.hours > 0 THEN ROUND((cd.lti::NUMERIC * 1000000) / ch.hours, 2) ELSE 0 END,
    CASE WHEN ch.hours > 0 THEN ROUND((cd.dart::NUMERIC * 200000) / ch.hours, 2) ELSE 0 END,
    CASE WHEN ch.hours > 0 THEN ROUND((cd.lost_days::NUMERIC * 200000) / ch.hours, 2) ELSE 0 END,
    CASE WHEN cd.incidents > 0 THEN ROUND((cd.near_miss::NUMERIC * 100) / cd.incidents, 1) ELSE 0 END,
    CASE WHEN ca.total > 0 THEN ROUND((ca.closed::NUMERIC * 100) / ca.total, 1) ELSE 0 END
  INTO v_current_trir, v_current_ltifr, v_current_dart, v_current_severity, v_current_near_miss, v_current_action_closure
  FROM current_data cd, current_hours ch, current_actions ca;
  
  -- Calculate previous period metrics
  WITH previous_data AS (
    SELECT 
      COUNT(*) FILTER (WHERE i.injury_classification IN ('medical_treatment', 'lost_time', 'fatality', 'first_aid')) AS recordable,
      COUNT(*) FILTER (WHERE i.injury_classification = 'lost_time') AS lti,
      COUNT(*) FILTER (WHERE i.injury_classification IN ('lost_time', 'restricted_duty')) AS dart,
      COALESCE(SUM(i.lost_days), 0) AS lost_days,
      COUNT(*) FILTER (WHERE i.event_type = 'observation' AND i.sub_type = 'near_miss') AS near_miss,
      COUNT(*) FILTER (WHERE i.event_type = 'incident') AS incidents
    FROM incidents i
    WHERE i.tenant_id = v_tenant_id
      AND i.deleted_at IS NULL
      AND i.occurred_at >= p_previous_start
      AND i.occurred_at <= p_previous_end
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
  ),
  previous_hours AS (
    SELECT COALESCE(SUM(m.employee_hours + m.contractor_hours), 0) AS hours
    FROM manhours_records m
    WHERE m.tenant_id = v_tenant_id
      AND m.deleted_at IS NULL
      AND m.period_start >= p_previous_start
      AND m.period_start <= p_previous_end
      AND (p_branch_id IS NULL OR m.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR m.site_id = p_site_id)
  ),
  previous_actions AS (
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status IN ('verified', 'closed')) AS closed
    FROM corrective_actions
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND created_at >= p_previous_start
      AND created_at <= p_previous_end
  )
  SELECT 
    CASE WHEN ph.hours > 0 THEN ROUND((pd.recordable::NUMERIC * 200000) / ph.hours, 2) ELSE 0 END,
    CASE WHEN ph.hours > 0 THEN ROUND((pd.lti::NUMERIC * 1000000) / ph.hours, 2) ELSE 0 END,
    CASE WHEN ph.hours > 0 THEN ROUND((pd.dart::NUMERIC * 200000) / ph.hours, 2) ELSE 0 END,
    CASE WHEN ph.hours > 0 THEN ROUND((pd.lost_days::NUMERIC * 200000) / ph.hours, 2) ELSE 0 END,
    CASE WHEN pd.incidents > 0 THEN ROUND((pd.near_miss::NUMERIC * 100) / pd.incidents, 1) ELSE 0 END,
    CASE WHEN pa.total > 0 THEN ROUND((pa.closed::NUMERIC * 100) / pa.total, 1) ELSE 0 END
  INTO v_previous_trir, v_previous_ltifr, v_previous_dart, v_previous_severity, v_previous_near_miss, v_previous_action_closure
  FROM previous_data pd, previous_hours ph, previous_actions pa;
  
  -- Return results
  RETURN QUERY
  SELECT 'trir'::TEXT, v_current_trir, v_previous_trir,
    CASE WHEN v_previous_trir > 0 THEN ROUND(((v_current_trir - v_previous_trir) / v_previous_trir) * 100, 1) ELSE 0 END,
    CASE WHEN v_current_trir < v_previous_trir THEN 'down' WHEN v_current_trir > v_previous_trir THEN 'up' ELSE 'stable' END
  UNION ALL
  SELECT 'ltifr'::TEXT, v_current_ltifr, v_previous_ltifr,
    CASE WHEN v_previous_ltifr > 0 THEN ROUND(((v_current_ltifr - v_previous_ltifr) / v_previous_ltifr) * 100, 1) ELSE 0 END,
    CASE WHEN v_current_ltifr < v_previous_ltifr THEN 'down' WHEN v_current_ltifr > v_previous_ltifr THEN 'up' ELSE 'stable' END
  UNION ALL
  SELECT 'dart'::TEXT, v_current_dart, v_previous_dart,
    CASE WHEN v_previous_dart > 0 THEN ROUND(((v_current_dart - v_previous_dart) / v_previous_dart) * 100, 1) ELSE 0 END,
    CASE WHEN v_current_dart < v_previous_dart THEN 'down' WHEN v_current_dart > v_previous_dart THEN 'up' ELSE 'stable' END
  UNION ALL
  SELECT 'severity_rate'::TEXT, v_current_severity, v_previous_severity,
    CASE WHEN v_previous_severity > 0 THEN ROUND(((v_current_severity - v_previous_severity) / v_previous_severity) * 100, 1) ELSE 0 END,
    CASE WHEN v_current_severity < v_previous_severity THEN 'down' WHEN v_current_severity > v_previous_severity THEN 'up' ELSE 'stable' END
  UNION ALL
  SELECT 'near_miss_rate'::TEXT, v_current_near_miss, v_previous_near_miss,
    CASE WHEN v_previous_near_miss > 0 THEN ROUND(((v_current_near_miss - v_previous_near_miss) / v_previous_near_miss) * 100, 1) ELSE 0 END,
    CASE WHEN v_current_near_miss > v_previous_near_miss THEN 'up' WHEN v_current_near_miss < v_previous_near_miss THEN 'down' ELSE 'stable' END
  UNION ALL
  SELECT 'action_closure_pct'::TEXT, v_current_action_closure, v_previous_action_closure,
    CASE WHEN v_previous_action_closure > 0 THEN ROUND(((v_current_action_closure - v_previous_action_closure) / v_previous_action_closure) * 100, 1) ELSE 0 END,
    CASE WHEN v_current_action_closure > v_previous_action_closure THEN 'up' WHEN v_current_action_closure < v_previous_action_closure THEN 'down' ELSE 'stable' END;
END;
$$;
