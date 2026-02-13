
-- Fix 1: get_dashboard_quick_action_counts - fix invalid enum values
DROP FUNCTION IF EXISTS public.get_dashboard_quick_action_counts();

CREATE OR REPLACE FUNCTION public.get_dashboard_quick_action_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        AND status IN ('pending_dept_rep_approval', 'expert_screening', 'pending_consultant_screening')
    ),
    'open_investigations', (
      SELECT COUNT(*) FROM investigations inv
      JOIN incidents i ON inv.incident_id = i.id
      WHERE i.tenant_id = v_tenant_id 
        AND i.deleted_at IS NULL
        AND inv.completed_at IS NULL
    ),
    'overdue_actions', (
      SELECT COUNT(*) FROM corrective_actions 
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND status NOT IN ('closed', 'verified')
        AND due_date < CURRENT_DATE
    ),
    'my_actions', (
      SELECT COUNT(*) FROM corrective_actions 
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND assigned_to = v_user_id
        AND status NOT IN ('closed', 'verified')
    ),
    'my_reports', (
      SELECT COUNT(*) FROM incidents
      WHERE tenant_id = v_tenant_id
        AND deleted_at IS NULL
        AND reporter_id = v_user_id
        AND status NOT IN ('closed', 'rejected_invalid')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- Fix 2: get_top_reporters - add p_branch_id and p_site_id parameters
DROP FUNCTION IF EXISTS public.get_top_reporters(integer, date, date);

CREATE OR REPLACE FUNCTION public.get_top_reporters(
  p_limit integer DEFAULT 10,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_site_id uuid DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
    LEFT JOIN departments d ON p.assigned_department_id = d.id
    WHERE p.tenant_id = v_tenant_id AND (p.is_deleted IS NULL OR p.is_deleted = FALSE)
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
$function$;

-- Fix 3: get_events_by_location - add p_branch_id and p_site_id parameters
DROP FUNCTION IF EXISTS public.get_events_by_location(date, date);

CREATE OR REPLACE FUNCTION public.get_events_by_location(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_site_id uuid DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_by_branch jsonb;
  v_by_site jsonb;
  v_by_department jsonb;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  -- Events by Branch with extended metrics
  SELECT COALESCE(jsonb_agg(row_data ORDER BY total_events DESC), '[]'::jsonb)
  INTO v_by_branch
  FROM (
    SELECT 
      b.id as branch_id,
      b.name as branch_name,
      COUNT(i.id) as total_events,
      COUNT(i.id) FILTER (WHERE i.event_type != 'observation') as incidents,
      COUNT(i.id) FILTER (WHERE i.event_type = 'observation') as observations,
      COUNT(i.id) FILTER (WHERE i.status IN ('investigation_in_progress', 'investigation_pending')) as open_investigations,
      COUNT(i.id) FILTER (WHERE i.status = 'closed') as closed_events,
      COUNT(i.id) FILTER (WHERE i.status NOT IN ('closed', 'expert_rejected', 'manager_rejected')) as open_events,
      COUNT(i.id) FILTER (WHERE i.severity = 'critical' OR i.severity = 'high') as high_severity_count,
      COALESCE((
        SELECT COUNT(*) FROM corrective_actions ca 
        WHERE ca.incident_id = ANY(ARRAY_AGG(i.id)) 
        AND ca.deleted_at IS NULL 
        AND ca.status NOT IN ('verified', 'closed', 'rejected')
      ), 0) as open_actions
    FROM branches b
    LEFT JOIN incidents i ON i.branch_id = b.id 
      AND i.tenant_id = v_tenant_id 
      AND i.deleted_at IS NULL
      AND (p_start_date IS NULL OR i.created_at >= p_start_date)
      AND (p_end_date IS NULL OR i.created_at <= p_end_date + INTERVAL '1 day')
    WHERE b.tenant_id = v_tenant_id AND b.deleted_at IS NULL
      AND (p_branch_id IS NULL OR b.id = p_branch_id)
    GROUP BY b.id, b.name
    HAVING COUNT(i.id) > 0
  ) row_data;

  -- Events by Site with extended metrics
  SELECT COALESCE(jsonb_agg(row_data ORDER BY total_events DESC), '[]'::jsonb)
  INTO v_by_site
  FROM (
    SELECT 
      s.id as site_id,
      s.name as site_name,
      b.name as branch_name,
      COUNT(i.id) as total_events,
      COUNT(i.id) FILTER (WHERE i.event_type != 'observation') as incidents,
      COUNT(i.id) FILTER (WHERE i.event_type = 'observation') as observations,
      COUNT(i.id) FILTER (WHERE i.status IN ('investigation_in_progress', 'investigation_pending')) as open_investigations,
      COUNT(i.id) FILTER (WHERE i.status = 'closed') as closed_events,
      COUNT(i.id) FILTER (WHERE i.status NOT IN ('closed', 'expert_rejected', 'manager_rejected')) as open_events,
      COUNT(i.id) FILTER (WHERE i.severity = 'critical' OR i.severity = 'high') as high_severity_count,
      COALESCE((
        SELECT COUNT(*) FROM corrective_actions ca 
        WHERE ca.incident_id = ANY(ARRAY_AGG(i.id)) 
        AND ca.deleted_at IS NULL 
        AND ca.status NOT IN ('verified', 'closed', 'rejected')
      ), 0) as open_actions
    FROM sites s
    JOIN branches b ON b.id = s.branch_id
    LEFT JOIN incidents i ON i.site_id = s.id 
      AND i.tenant_id = v_tenant_id 
      AND i.deleted_at IS NULL
      AND (p_start_date IS NULL OR i.created_at >= p_start_date)
      AND (p_end_date IS NULL OR i.created_at <= p_end_date + INTERVAL '1 day')
    WHERE s.tenant_id = v_tenant_id AND s.deleted_at IS NULL
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR s.id = p_site_id)
    GROUP BY s.id, s.name, b.name
    HAVING COUNT(i.id) > 0
  ) row_data;

  -- Events by Department with extended metrics
  SELECT COALESCE(jsonb_agg(row_data ORDER BY total_events DESC), '[]'::jsonb)
  INTO v_by_department
  FROM (
    SELECT 
      d.id as department_id,
      d.name as department_name,
      div.name as division_name,
      COUNT(i.id) as total_events,
      COUNT(i.id) FILTER (WHERE i.event_type != 'observation') as incidents,
      COUNT(i.id) FILTER (WHERE i.event_type = 'observation') as observations,
      COUNT(i.id) FILTER (WHERE i.status IN ('investigation_in_progress', 'investigation_pending')) as open_investigations,
      COUNT(i.id) FILTER (WHERE i.status = 'closed') as closed_events,
      COUNT(i.id) FILTER (WHERE i.status NOT IN ('closed', 'expert_rejected', 'manager_rejected')) as open_events,
      COUNT(i.id) FILTER (WHERE i.severity = 'critical' OR i.severity = 'high') as high_severity_count,
      COALESCE((
        SELECT COUNT(*) FROM corrective_actions ca 
        WHERE ca.incident_id = ANY(ARRAY_AGG(i.id)) 
        AND ca.deleted_at IS NULL 
        AND ca.status NOT IN ('verified', 'closed', 'rejected')
      ), 0) as open_actions
    FROM departments d
    JOIN divisions div ON div.id = d.division_id
    LEFT JOIN incidents i ON i.department_id = d.id 
      AND i.tenant_id = v_tenant_id 
      AND i.deleted_at IS NULL
      AND (p_start_date IS NULL OR i.created_at >= p_start_date)
      AND (p_end_date IS NULL OR i.created_at <= p_end_date + INTERVAL '1 day')
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
    WHERE d.tenant_id = v_tenant_id AND d.deleted_at IS NULL
    GROUP BY d.id, d.name, div.name
    HAVING COUNT(i.id) > 0
  ) row_data;

  RETURN jsonb_build_object(
    'by_branch', v_by_branch,
    'by_site', v_by_site,
    'by_department', v_by_department
  );
END;
$function$;

-- Fix 4: get_kpi_historical_trend - replace incident_date with occurred_at
DROP FUNCTION IF EXISTS public.get_kpi_historical_trend(date, date, uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_kpi_historical_trend(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_site_id uuid DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
      to_char(date_trunc('month', i.occurred_at), 'YYYY-MM-DD') AS month,
      COUNT(*) AS total_incidents,
      COUNT(*) FILTER (WHERE i.is_recordable = true) AS recordable_incidents,
      COUNT(*) FILTER (WHERE i.lost_workdays > 0) AS lost_time_incidents,
      COUNT(*) FILTER (WHERE i.is_recordable = true AND i.lost_workdays > 0) AS dart_cases,
      COALESCE(SUM(i.lost_workdays), 0) AS total_lost_days,
      200000 AS total_manhours,
      CASE WHEN 200000 > 0
        THEN ROUND((COUNT(*) FILTER (WHERE i.is_recordable = true)::numeric * 200000) / 200000, 2)
        ELSE 0
      END AS trir,
      CASE WHEN 200000 > 0
        THEN ROUND((COUNT(*) FILTER (WHERE i.lost_workdays > 0)::numeric * 1000000) / 200000, 2)
        ELSE 0
      END AS ltifr,
      CASE WHEN 200000 > 0
        THEN ROUND((COUNT(*) FILTER (WHERE i.is_recordable = true AND i.lost_workdays > 0)::numeric * 200000) / 200000, 2)
        ELSE 0
      END AS dart,
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
      AND i.occurred_at >= v_start
      AND i.occurred_at <= v_end
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
    GROUP BY date_trunc('month', i.occurred_at)
    ORDER BY date_trunc('month', i.occurred_at)
  ) monthly_data;

  RETURN v_result;
END;
$function$;
