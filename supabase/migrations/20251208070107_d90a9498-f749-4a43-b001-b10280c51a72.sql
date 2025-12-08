
-- RPC Function: Get HSSE Event Dashboard Stats
CREATE OR REPLACE FUNCTION get_hsse_event_dashboard_stats(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_start DATE;
  v_end DATE;
  v_result JSONB;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  v_start := COALESCE(p_start_date, (CURRENT_DATE - INTERVAL '12 months')::DATE);
  v_end := COALESCE(p_end_date, CURRENT_DATE);

  WITH summary_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_events,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND event_type = 'incident') AS total_incidents,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND event_type = 'observation') AS total_observations,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'investigation_in_progress') AS open_investigations,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'pending_closure') AS pending_closure,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'closed' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) AS closed_this_month,
      ROUND(AVG(EXTRACT(EPOCH FROM (CASE WHEN status = 'closed' THEN updated_at ELSE NULL END) - created_at) / 86400)::NUMERIC, 1) AS avg_closure_days
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND created_at >= v_start
      AND created_at <= v_end + INTERVAL '1 day'
  ),
  status_dist AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
      COUNT(*) FILTER (WHERE status = 'investigation_in_progress') AS investigation_in_progress,
      COUNT(*) FILTER (WHERE status = 'pending_closure') AS pending_closure,
      COUNT(*) FILTER (WHERE status = 'closed') AS closed
    FROM incidents
    WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
      AND created_at >= v_start AND created_at <= v_end + INTERVAL '1 day'
  ),
  severity_dist AS (
    SELECT
      COUNT(*) FILTER (WHERE severity = 'critical') AS critical,
      COUNT(*) FILTER (WHERE severity = 'high') AS high,
      COUNT(*) FILTER (WHERE severity = 'medium') AS medium,
      COUNT(*) FILTER (WHERE severity = 'low') AS low
    FROM incidents
    WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
      AND created_at >= v_start AND created_at <= v_end + INTERVAL '1 day'
  ),
  event_type_dist AS (
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'observation') AS observation,
      COUNT(*) FILTER (WHERE event_type = 'incident') AS incident,
      COUNT(*) FILTER (WHERE subtype = 'near_miss') AS near_miss,
      COUNT(*) FILTER (WHERE event_type = 'security_event') AS security_event,
      COUNT(*) FILTER (WHERE event_type = 'environmental_event') AS environmental_event
    FROM incidents
    WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
      AND created_at >= v_start AND created_at <= v_end + INTERVAL '1 day'
  ),
  monthly_trend AS (
    SELECT 
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE event_type = 'incident') AS incidents,
      COUNT(*) FILTER (WHERE event_type = 'observation') AS observations
    FROM incidents
    WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
      AND created_at >= (CURRENT_DATE - INTERVAL '12 months')
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month
  ),
  action_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status NOT IN ('closed', 'verified')) AS open_actions,
      COUNT(*) FILTER (WHERE status NOT IN ('closed', 'verified') AND due_date < CURRENT_DATE) AS overdue_actions,
      COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('closed', 'verified')) AS critical_actions,
      COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('closed', 'verified')) AS high_priority_actions
    FROM corrective_actions
    WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
      AND incident_id IS NOT NULL
  )
  SELECT jsonb_build_object(
    'summary', (SELECT jsonb_build_object(
      'total_events', total_events,
      'total_incidents', total_incidents,
      'total_observations', total_observations,
      'open_investigations', open_investigations,
      'pending_closure', pending_closure,
      'closed_this_month', closed_this_month,
      'avg_closure_days', COALESCE(avg_closure_days, 0)
    ) FROM summary_stats),
    'by_status', (SELECT jsonb_build_object(
      'submitted', submitted,
      'investigation_in_progress', investigation_in_progress,
      'pending_closure', pending_closure,
      'closed', closed
    ) FROM status_dist),
    'by_severity', (SELECT jsonb_build_object(
      'critical', critical,
      'high', high,
      'medium', medium,
      'low', low
    ) FROM severity_dist),
    'by_event_type', (SELECT jsonb_build_object(
      'observation', observation,
      'incident', incident,
      'near_miss', near_miss,
      'security_event', security_event,
      'environmental_event', environmental_event
    ) FROM event_type_dist),
    'monthly_trend', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'month', month,
      'total', total,
      'incidents', incidents,
      'observations', observations
    ) ORDER BY month) FROM monthly_trend), '[]'::jsonb),
    'actions', (SELECT jsonb_build_object(
      'open_actions', open_actions,
      'overdue_actions', overdue_actions,
      'critical_actions', critical_actions,
      'high_priority_actions', high_priority_actions
    ) FROM action_stats)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- RPC Function: Get Events by Location
CREATE OR REPLACE FUNCTION get_events_by_location(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_start DATE;
  v_end DATE;
  v_result JSONB;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  v_start := COALESCE(p_start_date, (CURRENT_DATE - INTERVAL '12 months')::DATE);
  v_end := COALESCE(p_end_date, CURRENT_DATE);

  WITH by_branch AS (
    SELECT 
      b.id AS branch_id,
      b.name AS branch_name,
      COUNT(i.id) AS total_events,
      COUNT(i.id) FILTER (WHERE i.event_type = 'incident') AS incidents,
      COUNT(i.id) FILTER (WHERE i.event_type = 'observation') AS observations,
      COUNT(i.id) FILTER (WHERE i.status = 'investigation_in_progress') AS open_investigations
    FROM branches b
    LEFT JOIN incidents i ON i.branch_id = b.id 
      AND i.deleted_at IS NULL 
      AND i.created_at >= v_start 
      AND i.created_at <= v_end + INTERVAL '1 day'
    WHERE b.tenant_id = v_tenant_id AND b.deleted_at IS NULL
    GROUP BY b.id, b.name
    ORDER BY total_events DESC
  ),
  by_site AS (
    SELECT 
      s.id AS site_id,
      s.name AS site_name,
      b.name AS branch_name,
      COUNT(i.id) AS total_events,
      COUNT(i.id) FILTER (WHERE i.event_type = 'incident') AS incidents,
      COUNT(i.id) FILTER (WHERE i.event_type = 'observation') AS observations
    FROM sites s
    JOIN branches b ON s.branch_id = b.id
    LEFT JOIN incidents i ON i.site_id = s.id 
      AND i.deleted_at IS NULL 
      AND i.created_at >= v_start 
      AND i.created_at <= v_end + INTERVAL '1 day'
    WHERE s.tenant_id = v_tenant_id AND s.deleted_at IS NULL
    GROUP BY s.id, s.name, b.name
    ORDER BY total_events DESC
    LIMIT 20
  ),
  by_department AS (
    SELECT 
      d.id AS department_id,
      d.name AS department_name,
      COUNT(i.id) AS total_events,
      COUNT(i.id) FILTER (WHERE i.event_type = 'incident') AS incidents,
      COUNT(i.id) FILTER (WHERE i.status = 'investigation_in_progress') AS open_investigations
    FROM departments d
    LEFT JOIN incidents i ON i.department_id = d.id 
      AND i.deleted_at IS NULL 
      AND i.created_at >= v_start 
      AND i.created_at <= v_end + INTERVAL '1 day'
    WHERE d.tenant_id = v_tenant_id AND d.deleted_at IS NULL
    GROUP BY d.id, d.name
    ORDER BY total_events DESC
  )
  SELECT jsonb_build_object(
    'by_branch', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'branch_id', branch_id,
      'branch_name', branch_name,
      'total_events', total_events,
      'incidents', incidents,
      'observations', observations,
      'open_investigations', open_investigations
    )) FROM by_branch), '[]'::jsonb),
    'by_site', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'site_id', site_id,
      'site_name', site_name,
      'branch_name', branch_name,
      'total_events', total_events,
      'incidents', incidents,
      'observations', observations
    )) FROM by_site), '[]'::jsonb),
    'by_department', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'department_id', department_id,
      'department_name', department_name,
      'total_events', total_events,
      'incidents', incidents,
      'open_investigations', open_investigations
    )) FROM by_department), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- RPC Function: Get Top Reporters
CREATE OR REPLACE FUNCTION get_top_reporters(p_limit INTEGER DEFAULT 10, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_start DATE;
  v_end DATE;
  v_result JSONB;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  v_start := COALESCE(p_start_date, (CURRENT_DATE - INTERVAL '12 months')::DATE);
  v_end := COALESCE(p_end_date, CURRENT_DATE);

  WITH reporter_stats AS (
    SELECT 
      p.id AS reporter_id,
      p.full_name AS reporter_name,
      p.avatar_url,
      d.name AS department_name,
      COUNT(i.id) AS total_reports,
      COUNT(i.id) FILTER (WHERE i.event_type = 'incident') AS incidents_reported,
      COUNT(i.id) FILTER (WHERE i.event_type = 'observation') AS observations_reported,
      MIN(i.created_at) AS first_report_date,
      MAX(i.created_at) AS last_report_date,
      ROW_NUMBER() OVER (ORDER BY COUNT(i.id) DESC) AS rank
    FROM profiles p
    JOIN incidents i ON i.reporter_id = p.id AND i.deleted_at IS NULL
      AND i.created_at >= v_start AND i.created_at <= v_end + INTERVAL '1 day'
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE p.tenant_id = v_tenant_id AND p.is_deleted = FALSE
    GROUP BY p.id, p.full_name, p.avatar_url, d.name
    ORDER BY total_reports DESC
    LIMIT p_limit
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'reporter_id', reporter_id,
    'reporter_name', reporter_name,
    'avatar_url', avatar_url,
    'department_name', department_name,
    'total_reports', total_reports,
    'incidents_reported', incidents_reported,
    'observations_reported', observations_reported,
    'first_report_date', first_report_date,
    'last_report_date', last_report_date,
    'rank', rank
  ) ORDER BY rank), '[]'::jsonb) INTO v_result
  FROM reporter_stats;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_hsse_event_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_events_by_location TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_reporters TO authenticated;
