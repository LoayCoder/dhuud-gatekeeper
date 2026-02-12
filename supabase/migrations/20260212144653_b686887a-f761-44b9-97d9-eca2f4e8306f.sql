
DROP FUNCTION IF EXISTS get_kpi_historical_trend(DATE, DATE, UUID, UUID);

CREATE OR REPLACE FUNCTION get_kpi_historical_trend(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
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

  SELECT COALESCE(jsonb_agg(row_to_json(monthly_data)::jsonb), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      to_char(date_trunc('month', i.incident_date), 'YYYY-MM-DD') AS month,
      COUNT(*) AS total_incidents,
      COUNT(*) FILTER (WHERE i.is_recordable = true) AS recordable_incidents,
      COUNT(*) FILTER (WHERE i.lost_workdays > 0) AS lost_time_incidents,
      COUNT(*) FILTER (WHERE i.is_recordable = true AND i.lost_workdays > 0) AS dart_cases,
      COALESCE(SUM(i.lost_workdays), 0) AS total_lost_days,
      200000 AS total_manhours,
      -- TRIR = (recordable * 200000) / manhours
      CASE WHEN 200000 > 0
        THEN ROUND((COUNT(*) FILTER (WHERE i.is_recordable = true)::numeric * 200000) / 200000, 2)
        ELSE 0
      END AS trir,
      -- LTIFR = (lost_time * 1000000) / manhours
      CASE WHEN 200000 > 0
        THEN ROUND((COUNT(*) FILTER (WHERE i.lost_workdays > 0)::numeric * 1000000) / 200000, 2)
        ELSE 0
      END AS ltifr,
      -- DART = (dart_cases * 200000) / manhours
      CASE WHEN 200000 > 0
        THEN ROUND((COUNT(*) FILTER (WHERE i.is_recordable = true AND i.lost_workdays > 0)::numeric * 200000) / 200000, 2)
        ELSE 0
      END AS dart,
      -- Severity Rate = (lost_days * 200000) / manhours
      CASE WHEN 200000 > 0
        THEN ROUND((COALESCE(SUM(i.lost_workdays), 0)::numeric * 200000) / 200000, 2)
        ELSE 0
      END AS severity_rate,
      0::numeric AS near_miss_rate,
      0::numeric AS action_closure_pct
    FROM incidents i
    WHERE i.tenant_id = v_tenant_id
      AND i.deleted_at IS NULL
      AND i.event_type = 'incident'
      AND i.incident_date >= v_start
      AND i.incident_date <= v_end
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
    GROUP BY date_trunc('month', i.incident_date)
    ORDER BY date_trunc('month', i.incident_date)
  ) monthly_data;

  RETURN v_result;
END;
$$;
