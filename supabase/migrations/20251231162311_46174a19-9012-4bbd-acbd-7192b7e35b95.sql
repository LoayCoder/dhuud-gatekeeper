-- Create RPC function for dept rep SLA analytics
CREATE OR REPLACE FUNCTION public.get_dept_rep_sla_analytics(
  p_period text DEFAULT 'month'
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_dept_id uuid;
  v_compliance_stats jsonb;
  v_trend_data jsonb;
  v_by_event_type jsonb;
  v_interval interval;
  v_periods int := 6;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := get_auth_tenant_id();
  
  IF v_user_id IS NULL OR v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'compliance_stats', jsonb_build_object('on_time', 0, 'overdue', 0, 'pending', 0, 'total', 0, 'compliance_rate', 0),
      'trend_data', '[]'::jsonb,
      'by_event_type', '[]'::jsonb
    );
  END IF;
  
  -- Get user's department
  SELECT assigned_department_id INTO v_dept_id
  FROM profiles WHERE id = v_user_id AND deleted_at IS NULL;
  
  IF v_dept_id IS NULL THEN
    RETURN jsonb_build_object(
      'compliance_stats', jsonb_build_object('on_time', 0, 'overdue', 0, 'pending', 0, 'total', 0, 'compliance_rate', 0),
      'trend_data', '[]'::jsonb,
      'by_event_type', '[]'::jsonb
    );
  END IF;
  
  v_interval := CASE WHEN p_period = 'week' THEN interval '1 week' ELSE interval '1 month' END;
  
  -- Get compliance stats from corrective actions for department incidents
  WITH dept_actions AS (
    SELECT 
      ca.id,
      ca.status,
      ca.due_date,
      ca.completed_at,
      i.event_type
    FROM corrective_actions ca
    JOIN incidents i ON ca.incident_id = i.id
    WHERE i.department_id = v_dept_id
      AND i.tenant_id = v_tenant_id
      AND i.deleted_at IS NULL
      AND ca.deleted_at IS NULL
  ),
  stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed' AND (completed_at <= due_date OR due_date IS NULL)) as on_time,
      COUNT(*) FILTER (WHERE status != 'completed' AND due_date < now()) as overdue,
      COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled') AND (due_date >= now() OR due_date IS NULL)) as pending,
      COUNT(*) as total
    FROM dept_actions
  )
  SELECT jsonb_build_object(
    'on_time', COALESCE(on_time, 0),
    'overdue', COALESCE(overdue, 0),
    'pending', COALESCE(pending, 0),
    'total', COALESCE(total, 0),
    'compliance_rate', CASE WHEN total > 0 THEN ROUND((on_time::numeric / NULLIF(on_time + overdue, 0)) * 100) ELSE 0 END
  ) INTO v_compliance_stats
  FROM stats;
  
  -- Get trend data for last 6 periods
  WITH periods AS (
    SELECT generate_series(
      date_trunc(p_period, now()) - (v_periods - 1) * v_interval,
      date_trunc(p_period, now()),
      v_interval
    ) as period_start
  ),
  period_stats AS (
    SELECT 
      p.period_start,
      COUNT(*) FILTER (WHERE ca.status = 'completed' AND (ca.completed_at <= ca.due_date OR ca.due_date IS NULL)) as resolved_on_time,
      COUNT(*) FILTER (WHERE ca.status = 'completed' AND ca.completed_at > ca.due_date) as resolved_overdue,
      COUNT(*) FILTER (WHERE ca.status = 'completed') as resolved_count
    FROM periods p
    LEFT JOIN corrective_actions ca ON 
      ca.completed_at >= p.period_start 
      AND ca.completed_at < p.period_start + v_interval
      AND ca.deleted_at IS NULL
    LEFT JOIN incidents i ON ca.incident_id = i.id 
      AND i.department_id = v_dept_id 
      AND i.tenant_id = v_tenant_id
      AND i.deleted_at IS NULL
    GROUP BY p.period_start
    ORDER BY p.period_start
  )
  SELECT jsonb_agg(jsonb_build_object(
    'period', period_start::text,
    'period_label', CASE 
      WHEN p_period = 'week' THEN to_char(period_start, 'DD Mon')
      ELSE to_char(period_start, 'Mon YYYY')
    END,
    'resolved_count', COALESCE(resolved_count, 0),
    'overdue_count', COALESCE(resolved_overdue, 0),
    'compliance_rate', CASE 
      WHEN COALESCE(resolved_count, 0) > 0 
      THEN ROUND((COALESCE(resolved_on_time, 0)::numeric / resolved_count) * 100) 
      ELSE 0 
    END
  )) INTO v_trend_data
  FROM period_stats;
  
  -- Get breakdown by event type
  WITH type_stats AS (
    SELECT 
      i.event_type,
      COUNT(*) FILTER (WHERE ca.status = 'completed' AND (ca.completed_at <= ca.due_date OR ca.due_date IS NULL)) as on_time,
      COUNT(*) FILTER (WHERE ca.status != 'completed' AND ca.due_date < now()) as overdue,
      COUNT(*) as total
    FROM incidents i
    JOIN corrective_actions ca ON ca.incident_id = i.id
    WHERE i.department_id = v_dept_id
      AND i.tenant_id = v_tenant_id
      AND i.deleted_at IS NULL
      AND ca.deleted_at IS NULL
    GROUP BY i.event_type
  )
  SELECT jsonb_agg(jsonb_build_object(
    'event_type', event_type,
    'on_time', COALESCE(on_time, 0),
    'overdue', COALESCE(overdue, 0),
    'total', COALESCE(total, 0)
  )) INTO v_by_event_type
  FROM type_stats;
  
  RETURN jsonb_build_object(
    'compliance_stats', COALESCE(v_compliance_stats, jsonb_build_object('on_time', 0, 'overdue', 0, 'pending', 0, 'total', 0, 'compliance_rate', 0)),
    'trend_data', COALESCE(v_trend_data, '[]'::jsonb),
    'by_event_type', COALESCE(v_by_event_type, '[]'::jsonb)
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_dept_rep_sla_analytics(text) TO authenticated;