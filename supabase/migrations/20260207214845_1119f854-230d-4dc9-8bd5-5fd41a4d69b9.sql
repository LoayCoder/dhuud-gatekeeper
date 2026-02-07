-- ============================================================================
-- Dashboard Data Integrity Fix Migration
-- Fixes: Column mismatches, missing branch filtering, severity levels,
--        tenant extraction, and date filtering inconsistencies
-- ============================================================================

-- Drop existing functions with old signatures to allow recreation
DROP FUNCTION IF EXISTS public.get_hsse_event_dashboard_stats(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_hsse_event_dashboard_stats(DATE, DATE, UUID);
DROP FUNCTION IF EXISTS public.get_cross_branch_analytics(UUID, DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_kpi_period_comparison(DATE, DATE, DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_kpi_historical_trend(DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_dashboard_quick_action_counts();

-- ============================================================================
-- 1. Fix get_hsse_event_dashboard_stats with branch filtering & 5-level severity
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_hsse_event_dashboard_stats(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_summary jsonb;
  v_by_status jsonb;
  v_by_severity jsonb;
  v_by_event_type jsonb;
  v_by_subtype jsonb;
  v_monthly_trend jsonb;
  v_actions jsonb;
BEGIN
  -- Get tenant ID using standard helper
  v_tenant_id := get_auth_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID not found';
  END IF;

  -- Summary statistics
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'total_incidents', COUNT(*) FILTER (WHERE event_type = 'incident'),
    'total_observations', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'open_investigations', (
      SELECT COUNT(*) FROM investigations inv
      JOIN incidents i2 ON inv.incident_id = i2.id
      WHERE i2.tenant_id = v_tenant_id 
        AND i2.deleted_at IS NULL
        AND inv.completed_at IS NULL
        AND (p_branch_id IS NULL OR i2.branch_id = p_branch_id)
    ),
    'pending_closure', COUNT(*) FILTER (WHERE status IN ('pending_closure', 'pending_final_closure')),
    'closed_this_month', COUNT(*) FILTER (
      WHERE status = 'closed' 
      AND closure_approved_at >= date_trunc('month', CURRENT_DATE)
    ),
    'avg_closure_days', COALESCE(
      ROUND(AVG(
        CASE WHEN closure_approved_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (closure_approved_at - created_at)) / 86400 
        END
      )::numeric, 1), 0
    ),
    'incidents_open', COUNT(*) FILTER (WHERE event_type = 'incident' AND status != 'closed'),
    'incidents_closed', COUNT(*) FILTER (WHERE event_type = 'incident' AND status = 'closed'),
    'incidents_overdue', COUNT(*) FILTER (
      WHERE event_type = 'incident' 
      AND status NOT IN ('closed', 'rejected_invalid')
      AND created_at < CURRENT_DATE - INTERVAL '30 days'
    ),
    'observations_open', COUNT(*) FILTER (WHERE event_type = 'observation' AND status != 'closed'),
    'observations_closed', COUNT(*) FILTER (WHERE event_type = 'observation' AND status = 'closed'),
    'total_investigations', (
      SELECT COUNT(*) FROM investigations inv
      JOIN incidents i2 ON inv.incident_id = i2.id
      WHERE i2.tenant_id = v_tenant_id AND i2.deleted_at IS NULL
        AND (p_branch_id IS NULL OR i2.branch_id = p_branch_id)
    ),
    'investigations_open', (
      SELECT COUNT(*) FROM investigations inv
      JOIN incidents i2 ON inv.incident_id = i2.id
      WHERE i2.tenant_id = v_tenant_id 
        AND i2.deleted_at IS NULL
        AND inv.completed_at IS NULL
        AND (p_branch_id IS NULL OR i2.branch_id = p_branch_id)
    ),
    'investigations_closed', (
      SELECT COUNT(*) FROM investigations inv
      JOIN incidents i2 ON inv.incident_id = i2.id
      WHERE i2.tenant_id = v_tenant_id 
        AND i2.deleted_at IS NULL
        AND inv.completed_at IS NOT NULL
        AND (p_branch_id IS NULL OR i2.branch_id = p_branch_id)
    ),
    'near_miss_count', COUNT(*) FILTER (WHERE subtype = 'near_miss'),
    'near_miss_rate', CASE WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE subtype = 'near_miss')::numeric / COUNT(*)) * 100, 1)
      ELSE 0 END
  ) INTO v_summary
  FROM incidents
  WHERE tenant_id = v_tenant_id 
    AND deleted_at IS NULL
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_start_date IS NULL OR occurred_at >= p_start_date::timestamp)
    AND (p_end_date IS NULL OR occurred_at < (p_end_date + 1)::timestamp);

  -- Status distribution
  SELECT jsonb_build_object(
    'submitted', COUNT(*) FILTER (WHERE status = 'submitted'),
    'expert_screening', COUNT(*) FILTER (WHERE status IN ('pending_expert_screening', 'pending_consultant_screening')),
    'pending_manager_approval', COUNT(*) FILTER (WHERE status IN ('pending_dept_rep_approval', 'pending_site_client_approval')),
    'investigation_in_progress', COUNT(*) FILTER (WHERE status = 'under_investigation'),
    'pending_closure', COUNT(*) FILTER (WHERE status IN ('pending_closure', 'pending_final_closure', 'pending_hsse_validation')),
    'closed', COUNT(*) FILTER (WHERE status = 'closed'),
    'returned', COUNT(*) FILTER (WHERE status = 'reopened'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected_invalid')
  ) INTO v_by_status
  FROM incidents
  WHERE tenant_id = v_tenant_id 
    AND deleted_at IS NULL
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_start_date IS NULL OR occurred_at >= p_start_date::timestamp)
    AND (p_end_date IS NULL OR occurred_at < (p_end_date + 1)::timestamp);

  -- Severity distribution (5-level system)
  SELECT jsonb_build_object(
    'level_1', COUNT(*) FILTER (WHERE severity_v2 = 'level_1'),
    'level_2', COUNT(*) FILTER (WHERE severity_v2 = 'level_2'),
    'level_3', COUNT(*) FILTER (WHERE severity_v2 = 'level_3'),
    'level_4', COUNT(*) FILTER (WHERE severity_v2 = 'level_4'),
    'level_5', COUNT(*) FILTER (WHERE severity_v2 = 'level_5'),
    'unassigned', COUNT(*) FILTER (WHERE severity_v2 IS NULL OR severity_v2 = '')
  ) INTO v_by_severity
  FROM incidents
  WHERE tenant_id = v_tenant_id 
    AND deleted_at IS NULL
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_start_date IS NULL OR occurred_at >= p_start_date::timestamp)
    AND (p_end_date IS NULL OR occurred_at < (p_end_date + 1)::timestamp);

  -- Event type distribution
  SELECT jsonb_build_object(
    'observation', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'incident', COUNT(*) FILTER (WHERE event_type = 'incident'),
    'near_miss', COUNT(*) FILTER (WHERE subtype = 'near_miss'),
    'security_event', COUNT(*) FILTER (WHERE category = 'security'),
    'environmental_event', COUNT(*) FILTER (WHERE category = 'environmental')
  ) INTO v_by_event_type
  FROM incidents
  WHERE tenant_id = v_tenant_id 
    AND deleted_at IS NULL
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_start_date IS NULL OR occurred_at >= p_start_date::timestamp)
    AND (p_end_date IS NULL OR occurred_at < (p_end_date + 1)::timestamp);

  -- Subtype distribution
  SELECT COALESCE(jsonb_object_agg(
    COALESCE(subtype, 'unspecified'), 
    cnt
  ), '{}'::jsonb) INTO v_by_subtype
  FROM (
    SELECT subtype, COUNT(*) as cnt
    FROM incidents
    WHERE tenant_id = v_tenant_id 
      AND deleted_at IS NULL
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_start_date IS NULL OR occurred_at >= p_start_date::timestamp)
      AND (p_end_date IS NULL OR occurred_at < (p_end_date + 1)::timestamp)
    GROUP BY subtype
  ) sub;

  -- Monthly trend (last 12 months)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(month_date, 'YYYY-MM'),
      'total', total,
      'incidents', incidents,
      'observations', observations
    ) ORDER BY month_date
  ), '[]'::jsonb) INTO v_monthly_trend
  FROM (
    SELECT 
      date_trunc('month', occurred_at)::date as month_date,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE event_type = 'incident') as incidents,
      COUNT(*) FILTER (WHERE event_type = 'observation') as observations
    FROM incidents
    WHERE tenant_id = v_tenant_id 
      AND deleted_at IS NULL
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND occurred_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
    GROUP BY date_trunc('month', occurred_at)::date
  ) trend;

  -- Actions statistics
  SELECT jsonb_build_object(
    'total_actions', COUNT(*),
    'open_actions', COUNT(*) FILTER (WHERE status IN ('open', 'in_progress')),
    'overdue_actions', COUNT(*) FILTER (
      WHERE status NOT IN ('closed', 'verified') 
      AND due_date < CURRENT_DATE
    ),
    'critical_actions', COUNT(*) FILTER (WHERE priority = 'critical'),
    'high_priority_actions', COUNT(*) FILTER (WHERE priority = 'high'),
    'actions_closed', COUNT(*) FILTER (WHERE status = 'closed'),
    'actions_in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'actions_pending_verification', COUNT(*) FILTER (WHERE status = 'pending_verification'),
    'overdue_rate', CASE WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (
        WHERE status NOT IN ('closed', 'verified') AND due_date < CURRENT_DATE
      )::numeric / COUNT(*)) * 100, 1)
      ELSE 0 END,
    'avg_completion_days', COALESCE(
      ROUND(AVG(
        CASE WHEN completed_at IS NOT NULL AND created_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400
        END
      )::numeric, 1), 0
    )
  ) INTO v_actions
  FROM corrective_actions ca
  WHERE ca.tenant_id = v_tenant_id 
    AND ca.deleted_at IS NULL
    AND (p_branch_id IS NULL OR ca.branch_id = p_branch_id);

  -- Return combined result
  RETURN jsonb_build_object(
    'summary', v_summary,
    'by_status', v_by_status,
    'by_severity', v_by_severity,
    'by_event_type', v_by_event_type,
    'by_subtype', v_by_subtype,
    'monthly_trend', v_monthly_trend,
    'actions', v_actions
  );
END;
$$;

-- ============================================================================
-- 2. Fix get_cross_branch_analytics - use occurred_at instead of incident_date
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_cross_branch_analytics(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_location_branch_id UUID DEFAULT NULL,
  p_reporter_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_summary jsonb;
  v_by_location_branch jsonb;
  v_by_reporter_branch jsonb;
  v_cross_branch_matrix jsonb;
BEGIN
  -- Summary statistics
  SELECT jsonb_build_object(
    'total_observations', COUNT(*),
    'cross_branch_count', COUNT(*) FILTER (WHERE i.branch_id != reporter_profile.assigned_branch_id),
    'same_branch_count', COUNT(*) FILTER (WHERE i.branch_id = reporter_profile.assigned_branch_id),
    'cross_branch_percentage', CASE WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE i.branch_id != reporter_profile.assigned_branch_id)::numeric / COUNT(*)) * 100, 1)
      ELSE 0 END
  ) INTO v_summary
  FROM incidents i
  LEFT JOIN profiles reporter_profile ON i.reporter_id = reporter_profile.id
  WHERE i.tenant_id = p_tenant_id 
    AND i.deleted_at IS NULL
    AND i.event_type = 'observation'
    AND (p_start_date IS NULL OR i.occurred_at::date >= p_start_date)
    AND (p_end_date IS NULL OR i.occurred_at::date <= p_end_date)
    AND (p_location_branch_id IS NULL OR i.branch_id = p_location_branch_id)
    AND (p_reporter_branch_id IS NULL OR reporter_profile.assigned_branch_id = p_reporter_branch_id);

  -- By location branch
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'branch_id', b.id,
      'branch_name', b.name,
      'branch_name_ar', b.name_ar,
      'total', total,
      'from_same_branch', same_branch,
      'from_other_branches', other_branch
    )
  ), '[]'::jsonb) INTO v_by_location_branch
  FROM (
    SELECT 
      i.branch_id,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE i.branch_id = reporter_profile.assigned_branch_id) as same_branch,
      COUNT(*) FILTER (WHERE i.branch_id != reporter_profile.assigned_branch_id) as other_branch
    FROM incidents i
    LEFT JOIN profiles reporter_profile ON i.reporter_id = reporter_profile.id
    WHERE i.tenant_id = p_tenant_id 
      AND i.deleted_at IS NULL
      AND i.event_type = 'observation'
      AND (p_start_date IS NULL OR i.occurred_at::date >= p_start_date)
      AND (p_end_date IS NULL OR i.occurred_at::date <= p_end_date)
      AND (p_location_branch_id IS NULL OR i.branch_id = p_location_branch_id)
      AND (p_reporter_branch_id IS NULL OR reporter_profile.assigned_branch_id = p_reporter_branch_id)
    GROUP BY i.branch_id
  ) stats
  JOIN branches b ON b.id = stats.branch_id;

  -- By reporter branch
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'branch_id', b.id,
      'branch_name', b.name,
      'branch_name_ar', b.name_ar,
      'total_reported', total,
      'reported_at_home', home_reports,
      'reported_elsewhere', away_reports
    )
  ), '[]'::jsonb) INTO v_by_reporter_branch
  FROM (
    SELECT 
      reporter_profile.assigned_branch_id as branch_id,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE i.branch_id = reporter_profile.assigned_branch_id) as home_reports,
      COUNT(*) FILTER (WHERE i.branch_id != reporter_profile.assigned_branch_id) as away_reports
    FROM incidents i
    JOIN profiles reporter_profile ON i.reporter_id = reporter_profile.id
    WHERE i.tenant_id = p_tenant_id 
      AND i.deleted_at IS NULL
      AND i.event_type = 'observation'
      AND reporter_profile.assigned_branch_id IS NOT NULL
      AND (p_start_date IS NULL OR i.occurred_at::date >= p_start_date)
      AND (p_end_date IS NULL OR i.occurred_at::date <= p_end_date)
      AND (p_location_branch_id IS NULL OR i.branch_id = p_location_branch_id)
      AND (p_reporter_branch_id IS NULL OR reporter_profile.assigned_branch_id = p_reporter_branch_id)
    GROUP BY reporter_profile.assigned_branch_id
  ) stats
  JOIN branches b ON b.id = stats.branch_id;

  -- Cross branch matrix
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'location_branch_id', loc_b.id,
      'location_branch_name', loc_b.name,
      'location_branch_name_ar', loc_b.name_ar,
      'reporter_branch_id', rep_b.id,
      'reporter_branch_name', rep_b.name,
      'reporter_branch_name_ar', rep_b.name_ar,
      'count', cnt,
      'is_cross_branch', loc_b.id != rep_b.id
    )
  ), '[]'::jsonb) INTO v_cross_branch_matrix
  FROM (
    SELECT 
      i.branch_id as location_branch_id,
      reporter_profile.assigned_branch_id as reporter_branch_id,
      COUNT(*) as cnt
    FROM incidents i
    JOIN profiles reporter_profile ON i.reporter_id = reporter_profile.id
    WHERE i.tenant_id = p_tenant_id 
      AND i.deleted_at IS NULL
      AND i.event_type = 'observation'
      AND reporter_profile.assigned_branch_id IS NOT NULL
      AND (p_start_date IS NULL OR i.occurred_at::date >= p_start_date)
      AND (p_end_date IS NULL OR i.occurred_at::date <= p_end_date)
      AND (p_location_branch_id IS NULL OR i.branch_id = p_location_branch_id)
      AND (p_reporter_branch_id IS NULL OR reporter_profile.assigned_branch_id = p_reporter_branch_id)
    GROUP BY i.branch_id, reporter_profile.assigned_branch_id
  ) matrix
  JOIN branches loc_b ON loc_b.id = matrix.location_branch_id
  JOIN branches rep_b ON rep_b.id = matrix.reporter_branch_id;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'by_location_branch', v_by_location_branch,
    'by_reporter_branch', v_by_reporter_branch,
    'cross_branch_matrix', v_cross_branch_matrix
  );
END;
$$;

-- ============================================================================
-- 3. Fix get_kpi_period_comparison - use lost_workdays and subtype
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_kpi_period_comparison(
  p_current_start DATE,
  p_current_end DATE,
  p_previous_start DATE,
  p_previous_end DATE,
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
  v_current_stats jsonb;
  v_previous_stats jsonb;
  v_result jsonb;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID not found';
  END IF;

  -- Get current period stats
  SELECT jsonb_build_object(
    'total_incidents', COUNT(*) FILTER (WHERE event_type = 'incident'),
    'total_observations', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'near_miss_count', COUNT(*) FILTER (WHERE subtype = 'near_miss'),
    'lost_workdays', COALESCE(SUM(lost_workdays), 0),
    'recordable_incidents', COUNT(*) FILTER (WHERE is_recordable = true),
    'closed_count', COUNT(*) FILTER (WHERE status = 'closed')
  ) INTO v_current_stats
  FROM incidents
  WHERE tenant_id = v_tenant_id 
    AND deleted_at IS NULL
    AND occurred_at >= p_current_start::timestamp
    AND occurred_at < (p_current_end + 1)::timestamp
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Get previous period stats
  SELECT jsonb_build_object(
    'total_incidents', COUNT(*) FILTER (WHERE event_type = 'incident'),
    'total_observations', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'near_miss_count', COUNT(*) FILTER (WHERE subtype = 'near_miss'),
    'lost_workdays', COALESCE(SUM(lost_workdays), 0),
    'recordable_incidents', COUNT(*) FILTER (WHERE is_recordable = true),
    'closed_count', COUNT(*) FILTER (WHERE status = 'closed')
  ) INTO v_previous_stats
  FROM incidents
  WHERE tenant_id = v_tenant_id 
    AND deleted_at IS NULL
    AND occurred_at >= p_previous_start::timestamp
    AND occurred_at < (p_previous_end + 1)::timestamp
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Build comparison result
  SELECT jsonb_agg(comparison) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'metric_name', metric,
      'current_value', COALESCE((v_current_stats->>metric)::numeric, 0),
      'previous_value', COALESCE((v_previous_stats->>metric)::numeric, 0),
      'percent_change', CASE 
        WHEN COALESCE((v_previous_stats->>metric)::numeric, 0) = 0 THEN 0
        ELSE ROUND(((COALESCE((v_current_stats->>metric)::numeric, 0) - COALESCE((v_previous_stats->>metric)::numeric, 0)) / COALESCE((v_previous_stats->>metric)::numeric, 1)) * 100, 1)
      END,
      'trend_direction', CASE 
        WHEN COALESCE((v_current_stats->>metric)::numeric, 0) > COALESCE((v_previous_stats->>metric)::numeric, 0) THEN 'up'
        WHEN COALESCE((v_current_stats->>metric)::numeric, 0) < COALESCE((v_previous_stats->>metric)::numeric, 0) THEN 'down'
        ELSE 'stable'
      END
    ) as comparison
    FROM unnest(ARRAY['total_incidents', 'total_observations', 'near_miss_count', 'lost_workdays', 'recordable_incidents', 'closed_count']) as metric
  ) comparisons;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================================
-- 4. Fix get_kpi_historical_trend - use occurred_at and lost_workdays
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_kpi_historical_trend(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
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
  v_result jsonb;
  v_start DATE;
  v_end DATE;
BEGIN
  -- Use standard tenant extraction
  v_tenant_id := get_auth_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID not found';
  END IF;

  v_start := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '12 months');
  v_end := COALESCE(p_end_date, CURRENT_DATE);

  -- Get monthly KPI trend data
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(month_date, 'YYYY-MM'),
      'trir', COALESCE(ROUND((recordable_incidents::numeric / NULLIF(total_manhours, 0)) * 200000, 2), 0),
      'ltifr', COALESCE(ROUND((lost_time_incidents::numeric / NULLIF(total_manhours, 0)) * 1000000, 2), 0),
      'dart', COALESCE(ROUND((dart_cases::numeric / NULLIF(total_manhours, 0)) * 200000, 2), 0),
      'severity_rate', COALESCE(ROUND((lost_workdays::numeric / NULLIF(total_manhours, 0)) * 200000, 2), 0),
      'near_miss_rate', COALESCE(ROUND((near_miss_count::numeric / NULLIF(total_incidents, 0)) * 100, 1), 0),
      'action_closure_pct', COALESCE(action_closure_pct, 0),
      'total_incidents', total_incidents,
      'total_manhours', total_manhours
    ) ORDER BY month_date
  ), '[]'::jsonb) INTO v_result
  FROM (
    SELECT 
      date_trunc('month', i.occurred_at)::date as month_date,
      COUNT(*) FILTER (WHERE i.event_type = 'incident') as total_incidents,
      COUNT(*) FILTER (WHERE i.is_recordable = true) as recordable_incidents,
      COUNT(*) FILTER (WHERE i.is_lost_time = true) as lost_time_incidents,
      COUNT(*) FILTER (WHERE i.is_recordable = true AND i.lost_workdays > 0) as dart_cases,
      COALESCE(SUM(i.lost_workdays), 0) as lost_workdays,
      COUNT(*) FILTER (WHERE i.subtype = 'near_miss') as near_miss_count,
      -- Get manhours from manhour_entries if available
      COALESCE((
        SELECT SUM(mh.hours_worked)
        FROM manhour_entries mh
        WHERE mh.tenant_id = v_tenant_id
          AND mh.deleted_at IS NULL
          AND date_trunc('month', mh.work_date) = date_trunc('month', i.occurred_at)
          AND (p_branch_id IS NULL OR mh.branch_id = p_branch_id)
          AND (p_site_id IS NULL OR mh.site_id = p_site_id)
      ), 200000) as total_manhours,
      -- Action closure percentage for the month
      COALESCE((
        SELECT ROUND((COUNT(*) FILTER (WHERE ca.status = 'closed')::numeric / NULLIF(COUNT(*), 0)) * 100, 1)
        FROM corrective_actions ca
        WHERE ca.tenant_id = v_tenant_id
          AND ca.deleted_at IS NULL
          AND date_trunc('month', ca.created_at) = date_trunc('month', i.occurred_at)
          AND (p_branch_id IS NULL OR ca.branch_id = p_branch_id)
      ), 0) as action_closure_pct
    FROM incidents i
    WHERE i.tenant_id = v_tenant_id 
      AND i.deleted_at IS NULL
      AND i.occurred_at >= v_start::timestamp
      AND i.occurred_at < (v_end + 1)::timestamp
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
    GROUP BY date_trunc('month', i.occurred_at)::date
  ) monthly_data;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 5. Fix get_dashboard_quick_action_counts - use reporter_id
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_quick_action_counts()
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := get_auth_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID not found';
  END IF;

  SELECT jsonb_build_object(
    'pending_approvals', (
      SELECT COUNT(*) FROM incidents 
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND status IN ('pending_dept_rep_approval', 'pending_expert_screening', 'pending_consultant_screening', 'pending_site_client_approval')
    ),
    'open_investigations', (
      SELECT COUNT(*) FROM investigations inv
      JOIN incidents i ON inv.incident_id = i.id
      WHERE i.tenant_id = v_tenant_id 
        AND i.deleted_at IS NULL
        AND inv.completed_at IS NULL
    ),
    'overdue_actions', (
      SELECT COUNT(*) FROM corrective_actions 
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND status NOT IN ('closed', 'verified')
        AND due_date < CURRENT_DATE
    ),
    'my_actions', (
      SELECT COUNT(*) FROM corrective_actions 
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND assigned_to = v_user_id
        AND status NOT IN ('closed', 'verified')
    ),
    'my_reports', (
      SELECT COUNT(*) FROM incidents
      WHERE tenant_id = v_tenant_id
        AND deleted_at IS NULL
        AND reporter_id = v_user_id
        AND status NOT IN ('closed', 'rejected_invalid')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_hsse_event_dashboard_stats(DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cross_branch_analytics(UUID, DATE, DATE, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_period_comparison(DATE, DATE, DATE, DATE, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_historical_trend(DATE, DATE, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_quick_action_counts() TO authenticated;