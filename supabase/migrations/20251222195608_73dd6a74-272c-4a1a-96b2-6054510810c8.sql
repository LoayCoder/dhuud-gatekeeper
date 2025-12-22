-- Update get_hsse_event_dashboard_stats to use severity_v2 only
CREATE OR REPLACE FUNCTION public.get_hsse_event_dashboard_stats(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_summary jsonb;
  v_by_status jsonb;
  v_by_severity jsonb;
  v_by_event_type jsonb;
  v_monthly_trend jsonb;
  v_actions jsonb;
BEGIN
  -- Get tenant from current user
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No tenant found');
  END IF;

  -- Summary stats
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'total_incidents', COUNT(*) FILTER (WHERE event_type = 'incident'),
    'total_observations', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'open_investigations', COUNT(*) FILTER (WHERE status IN ('investigation_in_progress', 'expert_screening', 'pending_manager_approval')),
    'pending_closure', COUNT(*) FILTER (WHERE status IN ('pending_closure', 'pending_final_closure')),
    'closed_this_month', COUNT(*) FILTER (WHERE status = 'closed' AND updated_at >= date_trunc('month', CURRENT_DATE)),
    'avg_closure_days', COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) FILTER (WHERE status = 'closed'), 0)::numeric(10,1),
    'incidents_open', COUNT(*) FILTER (WHERE event_type = 'incident' AND status NOT IN ('closed', 'rejected')),
    'incidents_closed', COUNT(*) FILTER (WHERE event_type = 'incident' AND status = 'closed'),
    'incidents_overdue', 0,
    'observations_open', COUNT(*) FILTER (WHERE event_type = 'observation' AND status NOT IN ('closed', 'rejected')),
    'observations_closed', COUNT(*) FILTER (WHERE event_type = 'observation' AND status = 'closed'),
    'total_investigations', COUNT(*) FILTER (WHERE status IN ('investigation_in_progress', 'expert_screening', 'pending_manager_approval', 'pending_closure', 'closed')),
    'investigations_open', COUNT(*) FILTER (WHERE status IN ('investigation_in_progress', 'expert_screening', 'pending_manager_approval')),
    'investigations_closed', COUNT(*) FILTER (WHERE status = 'closed'),
    'near_miss_count', COUNT(*) FILTER (WHERE event_type = 'near_miss'),
    'near_miss_rate', CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE event_type = 'near_miss')::numeric / COUNT(*) * 100)::numeric(10,1) ELSE 0 END
  ) INTO v_summary
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR occurred_at::date >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at::date <= p_end_date);

  -- Status distribution
  SELECT jsonb_build_object(
    'submitted', COUNT(*) FILTER (WHERE status = 'submitted'),
    'expert_screening', COUNT(*) FILTER (WHERE status = 'expert_screening'),
    'pending_manager_approval', COUNT(*) FILTER (WHERE status = 'pending_manager_approval'),
    'investigation_in_progress', COUNT(*) FILTER (WHERE status = 'investigation_in_progress'),
    'pending_closure', COUNT(*) FILTER (WHERE status IN ('pending_closure', 'pending_final_closure')),
    'closed', COUNT(*) FILTER (WHERE status = 'closed'),
    'returned', COUNT(*) FILTER (WHERE status = 'returned'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected')
  ) INTO v_by_status
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR occurred_at::date >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at::date <= p_end_date);

  -- Severity distribution using 5-level system (severity_v2 only)
  SELECT jsonb_build_object(
    'level_5', COUNT(*) FILTER (WHERE severity_v2 = 'level_5'),
    'level_4', COUNT(*) FILTER (WHERE severity_v2 = 'level_4'),
    'level_3', COUNT(*) FILTER (WHERE severity_v2 = 'level_3'),
    'level_2', COUNT(*) FILTER (WHERE severity_v2 = 'level_2'),
    'level_1', COUNT(*) FILTER (WHERE severity_v2 = 'level_1'),
    'unassigned', COUNT(*) FILTER (WHERE severity_v2 IS NULL)
  ) INTO v_by_severity
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR occurred_at::date >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at::date <= p_end_date);

  -- Event type distribution
  SELECT jsonb_build_object(
    'observation', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'incident', COUNT(*) FILTER (WHERE event_type = 'incident'),
    'near_miss', COUNT(*) FILTER (WHERE event_type = 'near_miss'),
    'security_event', COUNT(*) FILTER (WHERE event_type = 'security_event'),
    'environmental_event', COUNT(*) FILTER (WHERE event_type = 'environmental_event')
  ) INTO v_by_event_type
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR occurred_at::date >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at::date <= p_end_date);

  -- Monthly trend (last 12 months)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', to_char(month, 'YYYY-MM'),
      'total', total,
      'incidents', incidents,
      'observations', observations
    ) ORDER BY month
  ), '[]'::jsonb) INTO v_monthly_trend
  FROM (
    SELECT 
      date_trunc('month', occurred_at) as month,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE event_type = 'incident') as incidents,
      COUNT(*) FILTER (WHERE event_type = 'observation') as observations
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND occurred_at >= date_trunc('month', CURRENT_DATE) - interval '11 months'
    GROUP BY date_trunc('month', occurred_at)
  ) monthly;

  -- Actions stats
  SELECT jsonb_build_object(
    'open_actions', COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled')),
    'overdue_actions', COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled') AND due_date < CURRENT_DATE),
    'critical_actions', COUNT(*) FILTER (WHERE priority = 'critical'),
    'high_priority_actions', COUNT(*) FILTER (WHERE priority = 'high'),
    'total_actions', COUNT(*),
    'actions_closed', COUNT(*) FILTER (WHERE status = 'closed'),
    'actions_in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'actions_pending_verification', COUNT(*) FILTER (WHERE status = 'completed')
  ) INTO v_actions
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'by_status', v_by_status,
    'by_severity', v_by_severity,
    'by_event_type', v_by_event_type,
    'monthly_trend', v_monthly_trend,
    'actions', v_actions
  );
END;
$$;