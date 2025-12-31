-- Drop existing function first to allow signature change
DROP FUNCTION IF EXISTS public.get_dept_rep_events(text, text, int, int);

-- Recreate get_dept_rep_events with correct column references
CREATE OR REPLACE FUNCTION public.get_dept_rep_events(
  p_status text DEFAULT 'all',
  p_search text DEFAULT '',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  reference_id text,
  title text,
  event_type text,
  severity text,
  status text,
  reported_at timestamptz,
  reporter_name text,
  department_name text,
  total_actions bigint,
  completed_actions bigint,
  overdue_actions bigint,
  earliest_due_date date,
  sla_status text,
  days_overdue int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_dept_id uuid;
  v_tenant_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;

  SELECT p.assigned_department_id, p.tenant_id INTO v_dept_id, v_tenant_id
  FROM profiles p
  WHERE p.id = v_user_id AND p.deleted_at IS NULL;

  IF v_dept_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH action_stats AS (
    SELECT
      ca.incident_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE ca.status = 'completed' AND ca.deleted_at IS NULL) AS completed,
      COUNT(*) FILTER (
        WHERE ca.status != 'completed'
          AND ca.due_date < CURRENT_DATE
          AND ca.deleted_at IS NULL
      ) AS overdue,
      MIN(ca.due_date) FILTER (WHERE ca.status != 'completed' AND ca.deleted_at IS NULL) AS earliest_due
    FROM corrective_actions ca
    WHERE ca.deleted_at IS NULL
    GROUP BY ca.incident_id
  )
  SELECT
    i.id,
    i.reference_id,
    i.title,
    i.incident_type AS event_type,
    i.severity,
    i.status,
    i.created_at AS reported_at,
    COALESCE(rp.full_name, 'Unknown') AS reporter_name,
    COALESCE(d.name, 'Unknown') AS department_name,
    COALESCE(ast.total, 0)::bigint AS total_actions,
    COALESCE(ast.completed, 0)::bigint AS completed_actions,
    COALESCE(ast.overdue, 0)::bigint AS overdue_actions,
    ast.earliest_due AS earliest_due_date,
    CASE
      WHEN COALESCE(ast.overdue, 0) > 0 THEN 'overdue'
      WHEN ast.earliest_due IS NOT NULL AND ast.earliest_due <= CURRENT_DATE + 3 THEN 'at_risk'
      WHEN COALESCE(ast.total, 0) = COALESCE(ast.completed, 0) AND COALESCE(ast.total, 0) > 0 THEN 'completed'
      WHEN COALESCE(ast.total, 0) = 0 THEN 'pending'
      ELSE 'on_track'
    END AS sla_status,
    CASE
      WHEN ast.earliest_due IS NOT NULL AND ast.earliest_due < CURRENT_DATE
        THEN (CURRENT_DATE - ast.earliest_due)::int
      ELSE 0
    END AS days_overdue
  FROM incidents i
  LEFT JOIN profiles rp ON i.reporter_id = rp.id
  LEFT JOIN departments d ON i.department_id = d.id
  LEFT JOIN action_stats ast ON ast.incident_id = i.id
  WHERE i.department_id = v_dept_id
    AND i.tenant_id = v_tenant_id
    AND i.deleted_at IS NULL
    AND (
      p_status = 'all'
      OR (p_status = 'pending' AND i.status IN ('draft', 'submitted'))
      OR (p_status = 'in_progress' AND i.status = 'in_progress')
      OR (p_status = 'overdue' AND COALESCE(ast.overdue, 0) > 0)
      OR (p_status = 'completed' AND i.status IN ('closed', 'resolved'))
    )
    AND (
      p_search = ''
      OR i.reference_id ILIKE '%' || p_search || '%'
      OR i.title ILIKE '%' || p_search || '%'
    )
  ORDER BY
    CASE WHEN COALESCE(ast.overdue, 0) > 0 THEN 0 ELSE 1 END,
    ast.earliest_due NULLS LAST,
    i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Fix get_dept_rep_sla_analytics: use completed_date and assigned_department_id
CREATE OR REPLACE FUNCTION public.get_dept_rep_sla_analytics(
  p_period text DEFAULT 'month'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_dept_id uuid;
  v_tenant_id uuid;
  v_compliance_stats jsonb;
  v_trend_data jsonb;
  v_by_event_type jsonb;
  v_interval_val interval;
  v_trunc_field text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'compliance_stats', jsonb_build_object('on_time', 0, 'overdue', 0, 'pending', 0, 'total', 0, 'compliance_rate', 0),
      'trend_data', '[]'::jsonb,
      'by_event_type', '[]'::jsonb
    );
  END IF;

  SELECT p.assigned_department_id, p.tenant_id INTO v_dept_id, v_tenant_id
  FROM profiles p
  WHERE p.id = v_user_id AND p.deleted_at IS NULL;

  IF v_dept_id IS NULL THEN
    RETURN jsonb_build_object(
      'compliance_stats', jsonb_build_object('on_time', 0, 'overdue', 0, 'pending', 0, 'total', 0, 'compliance_rate', 0),
      'trend_data', '[]'::jsonb,
      'by_event_type', '[]'::jsonb
    );
  END IF;

  IF p_period = 'week' THEN
    v_interval_val := interval '1 week';
    v_trunc_field := 'week';
  ELSE
    v_interval_val := interval '1 month';
    v_trunc_field := 'month';
  END IF;

  SELECT jsonb_build_object(
    'on_time', COALESCE(SUM(CASE WHEN ca.status = 'completed' AND ca.completed_date <= ca.due_date THEN 1 ELSE 0 END), 0),
    'overdue', COALESCE(SUM(CASE WHEN ca.status = 'completed' AND ca.completed_date > ca.due_date THEN 1
                              WHEN ca.status != 'completed' AND ca.due_date < CURRENT_DATE THEN 1 ELSE 0 END), 0),
    'pending', COALESCE(SUM(CASE WHEN ca.status != 'completed' AND ca.due_date >= CURRENT_DATE THEN 1 ELSE 0 END), 0),
    'total', COUNT(*),
    'compliance_rate', CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COALESCE(SUM(CASE WHEN ca.status = 'completed' AND ca.completed_date <= ca.due_date THEN 1 ELSE 0 END), 0)::numeric / COUNT(*)::numeric) * 100)
    END
  ) INTO v_compliance_stats
  FROM corrective_actions ca
  JOIN incidents i ON ca.incident_id = i.id
  WHERE i.department_id = v_dept_id
    AND i.tenant_id = v_tenant_id
    AND ca.deleted_at IS NULL
    AND i.deleted_at IS NULL;

  SELECT COALESCE(jsonb_agg(trend ORDER BY trend.period), '[]'::jsonb) INTO v_trend_data
  FROM (
    SELECT
      date_trunc(v_trunc_field, periods.p)::date AS period,
      to_char(date_trunc(v_trunc_field, periods.p), CASE WHEN p_period = 'week' THEN 'IYYY-IW' ELSE 'Mon YYYY' END) AS period_label,
      COALESCE(SUM(CASE WHEN ca.status = 'completed' AND ca.completed_date <= ca.due_date THEN 1 ELSE 0 END), 0) AS resolved_count,
      COALESCE(SUM(CASE WHEN ca.status = 'completed' AND ca.completed_date > ca.due_date THEN 1 ELSE 0 END), 0) AS overdue_count,
      CASE
        WHEN COALESCE(SUM(CASE WHEN ca.status = 'completed' THEN 1 ELSE 0 END), 0) = 0 THEN 0
        ELSE ROUND((COALESCE(SUM(CASE WHEN ca.status = 'completed' AND ca.completed_date <= ca.due_date THEN 1 ELSE 0 END), 0)::numeric /
                    NULLIF(SUM(CASE WHEN ca.status = 'completed' THEN 1 ELSE 0 END), 0)::numeric) * 100)
      END AS compliance_rate
    FROM generate_series(
      date_trunc(v_trunc_field, CURRENT_DATE - (5 * v_interval_val)),
      date_trunc(v_trunc_field, CURRENT_DATE),
      v_interval_val
    ) AS periods(p)
    LEFT JOIN corrective_actions ca ON date_trunc(v_trunc_field, ca.completed_date) = date_trunc(v_trunc_field, periods.p)
      AND ca.deleted_at IS NULL
    LEFT JOIN incidents i ON ca.incident_id = i.id
      AND i.department_id = v_dept_id
      AND i.tenant_id = v_tenant_id
      AND i.deleted_at IS NULL
    GROUP BY periods.p
  ) trend;

  SELECT COALESCE(jsonb_agg(evt), '[]'::jsonb) INTO v_by_event_type
  FROM (
    SELECT
      i.incident_type AS event_type,
      COALESCE(SUM(CASE WHEN ca.status = 'completed' AND ca.completed_date <= ca.due_date THEN 1 ELSE 0 END), 0) AS on_time,
      COALESCE(SUM(CASE WHEN (ca.status = 'completed' AND ca.completed_date > ca.due_date)
                          OR (ca.status != 'completed' AND ca.due_date < CURRENT_DATE) THEN 1 ELSE 0 END), 0) AS overdue,
      COUNT(*) AS total
    FROM corrective_actions ca
    JOIN incidents i ON ca.incident_id = i.id
    WHERE i.department_id = v_dept_id
      AND i.tenant_id = v_tenant_id
      AND ca.deleted_at IS NULL
      AND i.deleted_at IS NULL
    GROUP BY i.incident_type
  ) evt;

  RETURN jsonb_build_object(
    'compliance_stats', v_compliance_stats,
    'trend_data', v_trend_data,
    'by_event_type', v_by_event_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dept_rep_events(text, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dept_rep_sla_analytics(text) TO authenticated;