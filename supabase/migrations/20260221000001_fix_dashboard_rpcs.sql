-- Fix Dashboard RPCs to support filtering by branch_id and site_id

-- 1. Update get_top_reporters
CREATE OR REPLACE FUNCTION get_top_reporters(
  p_limit INTEGER DEFAULT 10, 
  p_start_date DATE DEFAULT NULL, 
  p_end_date DATE DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
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
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
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

-- 2. Update get_events_by_location
CREATE OR REPLACE FUNCTION get_events_by_location(
  p_start_date DATE DEFAULT NULL, 
  p_end_date DATE DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
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
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
    WHERE b.tenant_id = v_tenant_id AND b.deleted_at IS NULL
      AND (p_branch_id IS NULL OR b.id = p_branch_id)
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
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
    WHERE s.tenant_id = v_tenant_id AND s.deleted_at IS NULL
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR s.id = p_site_id)
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
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_top_reporters TO authenticated;
GRANT EXECUTE ON FUNCTION get_events_by_location TO authenticated;
