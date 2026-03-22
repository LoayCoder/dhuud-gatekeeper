
-- Server-side dashboard aggregation RPC to eliminate the 1000-row client-side limit
-- Accepts date range + optional branch/site filters
-- Returns JSON with summary, status distribution, severity distribution, event type distribution, monthly trend, and action stats

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
BEGIN
  -- Get tenant from auth context
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant_id in JWT';
  END IF;

  -- Summary counts
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'total_incidents', COUNT(*) FILTER (WHERE event_type = 'incident'),
    'total_observations', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'incidents_open', COUNT(*) FILTER (WHERE event_type = 'incident' AND status NOT IN ('closed', 'rejected_invalid')),
    'incidents_closed', COUNT(*) FILTER (WHERE event_type = 'incident' AND status IN ('closed', 'rejected_invalid')),
    'observations_open', COUNT(*) FILTER (WHERE event_type = 'observation' AND status NOT IN ('closed', 'rejected_invalid')),
    'observations_closed', COUNT(*) FILTER (WHERE event_type = 'observation' AND status IN ('closed', 'rejected_invalid')),
    'pending_closure', COUNT(*) FILTER (WHERE status = 'pending_final_closure'),
    'closed_in_period', COUNT(*) FILTER (WHERE status = 'closed'),
    'near_miss_count', COUNT(*) FILTER (WHERE event_type = 'incident' AND incident_type = 'near_miss'),
    'incidents_overdue', COUNT(*) FILTER (
      WHERE event_type = 'incident' 
        AND status NOT IN ('closed', 'rejected_invalid')
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

  -- Investigation counts (only incidents with actual investigation-related statuses)
  v_summary := v_summary || (
    SELECT jsonb_build_object(
      'total_investigations', COUNT(*),
      'investigations_open', COUNT(*) FILTER (WHERE i.status NOT IN ('closed', 'rejected_invalid')),
      'investigations_closed', COUNT(*) FILTER (WHERE i.status IN ('closed', 'rejected_invalid')),
      'open_investigations', COUNT(*) FILTER (WHERE i.status NOT IN ('closed', 'rejected_invalid'))
    )
    FROM investigations inv
    JOIN incidents i ON i.id = inv.incident_id
    WHERE i.tenant_id = v_tenant_id
      AND i.deleted_at IS NULL
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

  -- Status distribution (dynamic — captures ALL statuses)
  SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
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

  -- Event type distribution (near_miss is a sub-count, not double-counted in incident)
  SELECT jsonb_build_object(
    'observation', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'incident', COUNT(*) FILTER (WHERE event_type = 'incident' AND (incident_type IS NULL OR incident_type != 'near_miss')),
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

  -- Monthly trend (derived from the actual date range, not hardcoded)
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

  -- Action stats
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

  -- Build final result
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
