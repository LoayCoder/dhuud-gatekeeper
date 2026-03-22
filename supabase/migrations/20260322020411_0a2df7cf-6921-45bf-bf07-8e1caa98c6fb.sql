
-- ============================================================================
-- Fix 1: get_hsse_dashboard_summary - Replace 'rejected_invalid' with valid terminal statuses
-- Fix 2: get_kpi_historical_trend - Use manhours table instead of non-existent manhour_entries
-- ============================================================================

-- Define terminal/closed statuses as a reusable concept:
-- closed, closed_rejected_approved_by_hsse, contractor_violation_cancelled, 
-- contractor_violation_terminated, contractor_violation_warning,
-- dept_rep_rejected, expert_rejected, manager_rejected, upgraded_to_incident

-- ============================================================================
-- 1. Fix get_hsse_dashboard_summary
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_hsse_dashboard_summary(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_site_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_result jsonb;
  v_summary jsonb;
  v_by_status jsonb;
  v_by_severity jsonb;
  v_by_event_type jsonb;
  v_by_subtype jsonb;
  v_monthly_trend jsonb;
  v_actions jsonb;
  v_now timestamptz := now();
  -- Valid terminal statuses from the incident_status enum
  v_closed_statuses text[] := ARRAY[
    'closed', 'closed_rejected_approved_by_hsse',
    'contractor_violation_cancelled', 'contractor_violation_terminated',
    'contractor_violation_warning', 'dept_rep_rejected', 'expert_rejected',
    'manager_rejected', 'upgraded_to_incident'
  ];
BEGIN
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant_id in JWT';
  END IF;

  -- Summary counts
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'total_incidents', COUNT(*) FILTER (WHERE event_type = 'incident'),
    'total_observations', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'incidents_open', COUNT(*) FILTER (WHERE event_type = 'incident' AND status::text != ALL(v_closed_statuses)),
    'incidents_closed', COUNT(*) FILTER (WHERE event_type = 'incident' AND status::text = ANY(v_closed_statuses)),
    'observations_open', COUNT(*) FILTER (WHERE event_type = 'observation' AND status::text != ALL(v_closed_statuses)),
    'observations_closed', COUNT(*) FILTER (WHERE event_type = 'observation' AND status::text = ANY(v_closed_statuses)),
    'pending_closure', COUNT(*) FILTER (WHERE status = 'pending_final_closure'),
    'closed_in_period', COUNT(*) FILTER (WHERE status = 'closed'),
    'near_miss_count', COUNT(*) FILTER (WHERE event_type = 'incident' AND incident_type = 'near_miss'),
    'incidents_overdue', COUNT(*) FILTER (
      WHERE event_type = 'incident' 
        AND status::text != ALL(v_closed_statuses)
        AND EXTRACT(EPOCH FROM (v_now - created_at)) / 3600 > 
          CASE severity_v2
            WHEN 'level_5' THEN 24
            WHEN 'level_4' THEN 72
            WHEN 'level_3' THEN 168
            WHEN 'level_2' THEN 336
            ELSE 720
          END
    )
  )
  INTO v_summary
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Investigation counts (only from actual investigations table, excluding soft-deleted)
  v_summary := v_summary || (
    SELECT jsonb_build_object(
      'total_investigations', COUNT(*),
      'investigations_open', COUNT(*) FILTER (WHERE inv.completed_at IS NULL),
      'investigations_closed', COUNT(*) FILTER (WHERE inv.completed_at IS NOT NULL),
      'open_investigations', COUNT(*) FILTER (WHERE inv.completed_at IS NULL)
    )
    FROM investigations inv
    JOIN incidents i ON i.id = inv.incident_id
    WHERE i.tenant_id = v_tenant_id
      AND i.deleted_at IS NULL
      AND inv.deleted_at IS NULL
      AND (p_start_date IS NULL OR i.created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR i.created_at <= (p_end_date + interval '1 day')::timestamptz)
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
  );

  -- Average closure days
  v_summary := v_summary || (
    SELECT jsonb_build_object(
      'avg_closure_days', COALESCE(
        ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::numeric, 1),
        0
      )
    )
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND status = 'closed'
      AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_site_id IS NULL OR site_id = p_site_id)
  );

  -- Status distribution (dynamic - all statuses)
  SELECT COALESCE(jsonb_object_agg(status::text, cnt), '{}'::jsonb)
  INTO v_by_status
  FROM (
    SELECT status, COUNT(*) as cnt
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_site_id IS NULL OR site_id = p_site_id)
    GROUP BY status
  ) s;

  -- Severity distribution
  SELECT jsonb_build_object(
    'level_1', COUNT(*) FILTER (WHERE severity_v2 = 'level_1'),
    'level_2', COUNT(*) FILTER (WHERE severity_v2 = 'level_2'),
    'level_3', COUNT(*) FILTER (WHERE severity_v2 = 'level_3'),
    'level_4', COUNT(*) FILTER (WHERE severity_v2 = 'level_4'),
    'level_5', COUNT(*) FILTER (WHERE severity_v2 = 'level_5'),
    'unassigned', COUNT(*) FILTER (WHERE severity_v2 IS NULL OR severity_v2 NOT IN ('level_1','level_2','level_3','level_4','level_5'))
  )
  INTO v_by_severity
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Event type distribution (mutually exclusive - no double counting)
  SELECT jsonb_build_object(
    'observation', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'incident', COUNT(*) FILTER (WHERE event_type = 'incident' AND (incident_type IS NULL OR incident_type NOT IN ('near_miss', 'security', 'environmental'))),
    'near_miss', COUNT(*) FILTER (WHERE event_type = 'incident' AND incident_type = 'near_miss'),
    'security_event', COUNT(*) FILTER (WHERE event_type = 'incident' AND incident_type = 'security'),
    'environmental_event', COUNT(*) FILTER (WHERE event_type = 'incident' AND incident_type = 'environmental')
  )
  INTO v_by_event_type
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Subtype distribution
  SELECT COALESCE(jsonb_object_agg(subtype, cnt), '{}'::jsonb)
  INTO v_by_subtype
  FROM (
    SELECT subtype, COUNT(*) as cnt
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND subtype IS NOT NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_site_id IS NULL OR site_id = p_site_id)
    GROUP BY subtype
  ) s;

  -- Monthly trend (dynamic based on date range)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', m.month_key,
      'total', COALESCE(d.total, 0),
      'incidents', COALESCE(d.incidents, 0),
      'observations', COALESCE(d.observations, 0)
    ) ORDER BY m.month_key
  ), '[]'::jsonb)
  INTO v_monthly_trend
  FROM (
    SELECT to_char(gs, 'YYYY-MM') as month_key
    FROM generate_series(
      COALESCE(p_start_date, (CURRENT_DATE - interval '5 months'))::date,
      COALESCE(p_end_date, CURRENT_DATE)::date,
      interval '1 month'
    ) gs
    GROUP BY to_char(gs, 'YYYY-MM')
  ) m
  LEFT JOIN (
    SELECT 
      to_char(created_at, 'YYYY-MM') as month_key,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE event_type = 'incident') as incidents,
      COUNT(*) FILTER (WHERE event_type = 'observation') as observations
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_site_id IS NULL OR site_id = p_site_id)
    GROUP BY to_char(created_at, 'YYYY-MM')
  ) d ON m.month_key = d.month_key;

  -- Action stats with released_at gate for incident-source actions
  SELECT jsonb_build_object(
    'total_actions', COUNT(*),
    'open_actions', COUNT(*) FILTER (WHERE status NOT IN ('completed', 'closed', 'verified')),
    'actions_closed', COUNT(*) FILTER (WHERE status IN ('completed', 'closed', 'verified')),
    'actions_in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'actions_pending_verification', COUNT(*) FILTER (WHERE status = 'pending_verification'),
    'overdue_actions', COUNT(*) FILTER (WHERE status NOT IN ('completed', 'closed', 'verified') AND due_date < CURRENT_DATE),
    'critical_actions', COUNT(*) FILTER (WHERE priority = 'critical'),
    'high_priority_actions', COUNT(*) FILTER (WHERE priority = 'high')
  )
  INTO v_actions
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (source_type != 'incident' OR released_at IS NOT NULL)
    AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
    AND (
      (p_branch_id IS NULL AND p_site_id IS NULL) 
      OR branch_id = p_branch_id
      OR incident_id IN (
        SELECT id FROM incidents 
        WHERE tenant_id = v_tenant_id 
          AND deleted_at IS NULL
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)
          AND (p_site_id IS NULL OR site_id = p_site_id)
      )
    );

  v_result := jsonb_build_object(
    'summary', v_summary,
    'by_status', v_by_status,
    'by_severity', v_by_severity,
    'by_event_type', v_by_event_type,
    'by_subtype', v_by_subtype,
    'monthly_trend', v_monthly_trend,
    'actions', v_actions
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 2. Fix get_kpi_historical_trend - use real manhours table instead of non-existent manhour_entries
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_kpi_historical_trend(DATE, DATE, UUID, UUID);

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
  v_tenant_id := get_auth_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID not found';
  END IF;

  v_start := COALESCE(p_start_date, (CURRENT_DATE - INTERVAL '12 months')::DATE);
  v_end := COALESCE(p_end_date, CURRENT_DATE);

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', to_char(ms.month_date, 'YYYY-MM'),
      'trir', COALESCE(ROUND((COALESCE(id.recordable_incidents, 0)::numeric / NULLIF(COALESCE(mh.total_hours, 200000), 0)) * 200000, 2), 0),
      'ltifr', COALESCE(ROUND((COALESCE(id.lost_time_incidents, 0)::numeric / NULLIF(COALESCE(mh.total_hours, 200000), 0)) * 1000000, 2), 0),
      'dart', COALESCE(ROUND((COALESCE(id.dart_cases, 0)::numeric / NULLIF(COALESCE(mh.total_hours, 200000), 0)) * 200000, 2), 0),
      'severity_rate', COALESCE(ROUND((COALESCE(id.lost_workdays, 0)::numeric / NULLIF(COALESCE(mh.total_hours, 200000), 0)) * 200000, 2), 0),
      'near_miss_rate', COALESCE(ROUND((COALESCE(id.near_miss_count, 0)::numeric / NULLIF(COALESCE(id.total_incidents, 0), 0)) * 100, 1), 0),
      'action_closure_pct', COALESCE(ac.closure_pct, 0),
      'total_incidents', COALESCE(id.total_incidents, 0),
      'total_manhours', COALESCE(mh.total_hours, 200000)
    ) ORDER BY ms.month_date
  ), '[]'::jsonb)
  INTO v_result
  FROM (
    -- Generate month series
    SELECT date_trunc('month', gs)::date as month_date
    FROM generate_series(v_start::timestamp, v_end::timestamp, interval '1 month') gs
  ) ms
  LEFT JOIN (
    -- Incident data aggregated by month
    SELECT 
      date_trunc('month', i.occurred_at)::date as month_date,
      COUNT(*) FILTER (WHERE i.event_type = 'incident') as total_incidents,
      COUNT(*) FILTER (WHERE i.is_recordable = true) as recordable_incidents,
      COUNT(*) FILTER (WHERE i.is_lost_time = true) as lost_time_incidents,
      COUNT(*) FILTER (WHERE i.is_recordable = true AND i.lost_workdays > 0) as dart_cases,
      COALESCE(SUM(i.lost_workdays), 0) as lost_workdays,
      COUNT(*) FILTER (WHERE i.subtype = 'near_miss') as near_miss_count
    FROM incidents i
    WHERE i.tenant_id = v_tenant_id 
      AND i.deleted_at IS NULL
      AND i.occurred_at >= v_start::timestamp
      AND i.occurred_at < (v_end + 1)::timestamp
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
    GROUP BY date_trunc('month', i.occurred_at)::date
  ) id ON id.month_date = ms.month_date
  LEFT JOIN (
    -- Manhours from the actual manhours table
    SELECT 
      date_trunc('month', mh.period_date)::date as month_date,
      SUM(COALESCE(mh.employee_hours, 0) + COALESCE(mh.contractor_hours, 0)) as total_hours
    FROM manhours mh
    WHERE mh.tenant_id = v_tenant_id
      AND mh.deleted_at IS NULL
      AND mh.period_date >= v_start
      AND mh.period_date <= v_end
      AND (p_branch_id IS NULL OR mh.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR mh.site_id = p_site_id)
    GROUP BY date_trunc('month', mh.period_date)::date
  ) mh ON mh.month_date = ms.month_date
  LEFT JOIN (
    -- Action closure percentage by month
    SELECT 
      date_trunc('month', ca.created_at)::date as month_date,
      ROUND((COUNT(*) FILTER (WHERE ca.status IN ('completed', 'closed', 'verified'))::numeric / NULLIF(COUNT(*), 0)) * 100, 1) as closure_pct
    FROM corrective_actions ca
    WHERE ca.tenant_id = v_tenant_id
      AND ca.deleted_at IS NULL
      AND ca.created_at >= v_start::timestamp
      AND ca.created_at < (v_end + 1)::timestamp
      AND (p_branch_id IS NULL OR ca.branch_id = p_branch_id)
    GROUP BY date_trunc('month', ca.created_at)::date
  ) ac ON ac.month_date = ms.month_date;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_kpi_historical_trend(DATE, DATE, UUID, UUID) TO authenticated;

-- Also fix get_dashboard_quick_action_counts to not reference rejected_invalid
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
        AND inv.deleted_at IS NULL
        AND inv.completed_at IS NULL
    ),
    'overdue_actions', (
      SELECT COUNT(*) FROM corrective_actions 
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND status NOT IN ('completed', 'closed', 'verified')
        AND due_date < CURRENT_DATE
    ),
    'my_actions', (
      SELECT COUNT(*) FROM corrective_actions 
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND assigned_to = v_user_id
        AND status NOT IN ('completed', 'closed', 'verified')
    ),
    'my_reports', (
      SELECT COUNT(*) FROM incidents
      WHERE tenant_id = v_tenant_id
        AND deleted_at IS NULL
        AND reporter_id = v_user_id
        AND status NOT IN ('closed', 'closed_rejected_approved_by_hsse', 'contractor_violation_cancelled', 'contractor_violation_terminated')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
