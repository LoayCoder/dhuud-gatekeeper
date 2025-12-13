
-- Fix get_hsse_event_dashboard_stats to use completed_at instead of non-existent status column
CREATE OR REPLACE FUNCTION public.get_hsse_event_dashboard_stats(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_result jsonb;
  v_summary jsonb;
  v_by_status jsonb;
  v_by_severity jsonb;
  v_by_event_type jsonb;
  v_by_subtype jsonb;
  v_monthly_trend jsonb;
  v_actions jsonb;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  -- Summary with extended breakdowns
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'total_incidents', COUNT(*) FILTER (WHERE event_type != 'observation'),
    'total_observations', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'open_investigations', COUNT(*) FILTER (WHERE status IN ('investigation_in_progress', 'investigation_pending', 'pending_manager_approval', 'hsse_manager_escalation')),
    'pending_closure', COUNT(*) FILTER (WHERE status IN ('pending_closure', 'pending_final_closure')),
    'closed_this_month', COUNT(*) FILTER (WHERE status = 'closed' AND DATE_TRUNC('month', closure_approved_at) = DATE_TRUNC('month', CURRENT_DATE)),
    'avg_closure_days', COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (closure_approved_at - created_at)) / 86400) FILTER (WHERE status = 'closed' AND closure_approved_at IS NOT NULL)), 0),
    -- Extended breakdowns
    'incidents_open', COUNT(*) FILTER (WHERE event_type != 'observation' AND status NOT IN ('closed', 'expert_rejected', 'manager_rejected', 'no_investigation_required')),
    'incidents_closed', COUNT(*) FILTER (WHERE event_type != 'observation' AND status = 'closed'),
    'incidents_overdue', COUNT(*) FILTER (WHERE event_type != 'observation' AND status NOT IN ('closed', 'expert_rejected', 'manager_rejected') AND created_at < (CURRENT_DATE - INTERVAL '30 days')),
    'observations_open', COUNT(*) FILTER (WHERE event_type = 'observation' AND status NOT IN ('closed', 'expert_rejected', 'manager_rejected', 'no_investigation_required')),
    'observations_closed', COUNT(*) FILTER (WHERE event_type = 'observation' AND status = 'closed'),
    -- Near miss analysis
    'near_miss_count', COUNT(*) FILTER (WHERE event_type = 'near_miss' OR subtype = 'near_miss'),
    'near_miss_rate', CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'near_miss' OR subtype = 'near_miss')::numeric / COUNT(*)::numeric) * 100, 1)
      ELSE 0 
    END
  ) INTO v_summary
  FROM incidents
  WHERE tenant_id = v_tenant_id 
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day');

  -- Status distribution with all statuses
  SELECT jsonb_build_object(
    'submitted', COUNT(*) FILTER (WHERE status = 'submitted'),
    'expert_screening', COUNT(*) FILTER (WHERE status = 'expert_screening'),
    'pending_manager_approval', COUNT(*) FILTER (WHERE status = 'pending_manager_approval'),
    'pending_dept_rep_approval', COUNT(*) FILTER (WHERE status = 'pending_dept_rep_approval'),
    'hsse_manager_escalation', COUNT(*) FILTER (WHERE status = 'hsse_manager_escalation'),
    'investigation_pending', COUNT(*) FILTER (WHERE status = 'investigation_pending'),
    'investigation_in_progress', COUNT(*) FILTER (WHERE status IN ('investigation_in_progress', 'investigation_closed')),
    'pending_closure', COUNT(*) FILTER (WHERE status IN ('pending_closure', 'pending_final_closure')),
    'closed', COUNT(*) FILTER (WHERE status = 'closed'),
    'returned', COUNT(*) FILTER (WHERE status = 'returned_to_reporter'),
    'rejected', COUNT(*) FILTER (WHERE status IN ('expert_rejected', 'manager_rejected'))
  ) INTO v_by_status
  FROM incidents
  WHERE tenant_id = v_tenant_id 
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day');

  -- Severity distribution
  SELECT jsonb_build_object(
    'critical', COUNT(*) FILTER (WHERE severity = 'critical'),
    'high', COUNT(*) FILTER (WHERE severity = 'high'),
    'medium', COUNT(*) FILTER (WHERE severity = 'medium'),
    'low', COUNT(*) FILTER (WHERE severity = 'low'),
    'unassigned', COUNT(*) FILTER (WHERE severity IS NULL)
  ) INTO v_by_severity
  FROM incidents
  WHERE tenant_id = v_tenant_id 
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day');

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
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day');

  -- Subtype distribution for more detailed analysis
  SELECT COALESCE(jsonb_object_agg(subtype, cnt), '{}'::jsonb)
  INTO v_by_subtype
  FROM (
    SELECT subtype, COUNT(*) as cnt
    FROM incidents
    WHERE tenant_id = v_tenant_id 
      AND deleted_at IS NULL
      AND subtype IS NOT NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day')
    GROUP BY subtype
  ) sub;

  -- Monthly trend (last 6 months)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY month), '[]'::jsonb)
  INTO v_monthly_trend
  FROM (
    SELECT 
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE event_type != 'observation') as incidents,
      COUNT(*) FILTER (WHERE event_type = 'observation') as observations,
      COUNT(*) FILTER (WHERE severity IN ('critical', 'high')) as high_severity
    FROM incidents
    WHERE tenant_id = v_tenant_id 
      AND deleted_at IS NULL
      AND created_at >= (CURRENT_DATE - INTERVAL '6 months')
    GROUP BY DATE_TRUNC('month', created_at)
  ) row_data;

  -- Actions stats with extended breakdowns
  SELECT jsonb_build_object(
    'open_actions', COUNT(*) FILTER (WHERE status NOT IN ('verified', 'closed', 'rejected')),
    'overdue_actions', COUNT(*) FILTER (WHERE status NOT IN ('verified', 'closed', 'rejected') AND due_date < CURRENT_DATE),
    'critical_actions', COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('verified', 'closed', 'rejected')),
    'high_priority_actions', COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('verified', 'closed', 'rejected')),
    -- Extended breakdowns
    'total_actions', COUNT(*),
    'actions_closed', COUNT(*) FILTER (WHERE status IN ('verified', 'closed')),
    'actions_in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'actions_pending_verification', COUNT(*) FILTER (WHERE status = 'completed'),
    'overdue_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE status NOT IN ('verified', 'closed', 'rejected')) > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE status NOT IN ('verified', 'closed', 'rejected') AND due_date < CURRENT_DATE)::numeric / 
         COUNT(*) FILTER (WHERE status NOT IN ('verified', 'closed', 'rejected'))::numeric) * 100, 1
      )
      ELSE 0 
    END,
    'avg_completion_days', COALESCE(
      ROUND(AVG(EXTRACT(EPOCH FROM (completed_date - start_date)) / 86400) FILTER (WHERE completed_date IS NOT NULL AND start_date IS NOT NULL)), 
      0
    )
  ) INTO v_actions
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id 
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day');

  -- Get total investigations from investigations table using completed_at instead of status
  v_summary := v_summary || jsonb_build_object(
    'total_investigations', (
      SELECT COUNT(*) FROM investigations 
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day')
    ),
    'investigations_open', (
      SELECT COUNT(*) FROM investigations 
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL 
        AND completed_at IS NULL  -- Open = not completed
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day')
    ),
    'investigations_closed', (
      SELECT COUNT(*) FROM investigations 
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL 
        AND completed_at IS NOT NULL  -- Closed = completed
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day')
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
$function$;
