-- Drop existing function first due to return type change
DROP FUNCTION IF EXISTS public.get_kpi_historical_trend(DATE, DATE, UUID, UUID);

-- Recreate get_kpi_historical_trend RPC with correct table/column names
CREATE OR REPLACE FUNCTION public.get_kpi_historical_trend(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS TABLE(
  month TEXT,
  trir NUMERIC,
  ltifr NUMERIC,
  dart NUMERIC,
  severity_rate NUMERIC,
  total_incidents BIGINT,
  total_manhours NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Get tenant ID from auth context
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID INTO v_tenant_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID not found in JWT';
  END IF;

  -- Default to last 12 months if no dates provided
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '12 months');

  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      DATE_TRUNC('month', v_start_date)::DATE,
      DATE_TRUNC('month', v_end_date)::DATE,
      INTERVAL '1 month'
    )::DATE AS month_start
  ),
  monthly_incidents AS (
    SELECT 
      DATE_TRUNC('month', i.incident_date)::DATE AS month,
      COUNT(*) AS incident_count,
      -- Count recordable incidents (not first_aid or near_miss)
      COUNT(*) FILTER (WHERE 
        COALESCE(i.injury_classification, i.subtype) NOT IN ('first_aid', 'near_miss', 'observation')
        AND i.event_type = 'incident'
      ) AS recordable_count,
      -- Count lost time incidents
      COUNT(*) FILTER (WHERE 
        COALESCE(i.injury_classification, i.subtype) IN ('lost_time', 'lost_time_injury')
      ) AS lost_time_count,
      -- Count restricted/transferred
      COUNT(*) FILTER (WHERE 
        COALESCE(i.injury_classification, i.subtype) IN ('restricted_work', 'restricted_duty')
      ) AS restricted_count,
      -- Sum lost days
      COALESCE(SUM(i.lost_days), 0) AS total_lost_days
    FROM incidents i
    WHERE i.tenant_id = v_tenant_id
      AND i.deleted_at IS NULL
      AND i.incident_date >= v_start_date
      AND i.incident_date <= v_end_date
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
    GROUP BY DATE_TRUNC('month', i.incident_date)::DATE
  ),
  monthly_manhours AS (
    SELECT 
      DATE_TRUNC('month', m.period_date)::DATE AS month,
      COALESCE(SUM(m.employee_hours + m.contractor_hours), 0) AS total_hours
    FROM manhours m
    WHERE m.tenant_id = v_tenant_id
      AND m.deleted_at IS NULL
      AND m.period_date >= v_start_date
      AND m.period_date <= v_end_date
      AND (p_branch_id IS NULL OR m.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR m.site_id = p_site_id)
    GROUP BY DATE_TRUNC('month', m.period_date)::DATE
  )
  SELECT 
    TO_CHAR(months.month_start, 'YYYY-MM-DD') AS month,
    -- TRIR = (Recordable Incidents × 200,000) / Total Man-Hours
    CASE 
      WHEN COALESCE(mh.total_hours, 0) > 0 
      THEN ROUND((COALESCE(mi.recordable_count, 0)::NUMERIC * 200000) / mh.total_hours, 2)
      ELSE 0
    END AS trir,
    -- LTIFR = (Lost Time Injuries × 1,000,000) / Total Man-Hours
    CASE 
      WHEN COALESCE(mh.total_hours, 0) > 0 
      THEN ROUND((COALESCE(mi.lost_time_count, 0)::NUMERIC * 1000000) / mh.total_hours, 2)
      ELSE 0
    END AS ltifr,
    -- DART = ((Lost Time + Restricted) × 200,000) / Total Man-Hours
    CASE 
      WHEN COALESCE(mh.total_hours, 0) > 0 
      THEN ROUND(((COALESCE(mi.lost_time_count, 0) + COALESCE(mi.restricted_count, 0))::NUMERIC * 200000) / mh.total_hours, 2)
      ELSE 0
    END AS dart,
    -- Severity Rate = (Lost Days × 200,000) / Total Man-Hours
    CASE 
      WHEN COALESCE(mh.total_hours, 0) > 0 
      THEN ROUND((COALESCE(mi.total_lost_days, 0)::NUMERIC * 200000) / mh.total_hours, 2)
      ELSE 0
    END AS severity_rate,
    COALESCE(mi.incident_count, 0) AS total_incidents,
    COALESCE(mh.total_hours, 0) AS total_manhours
  FROM months
  LEFT JOIN monthly_incidents mi ON mi.month = months.month_start
  LEFT JOIN monthly_manhours mh ON mh.month = months.month_start
  ORDER BY months.month_start;
END;
$$;