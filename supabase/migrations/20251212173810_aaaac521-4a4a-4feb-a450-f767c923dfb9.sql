-- Fix: Replace invalid 'rejected' enum value with correct values 'expert_rejected' and 'manager_rejected'

CREATE OR REPLACE FUNCTION public.get_hsse_event_dashboard_stats(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_result jsonb;
  v_summary jsonb;
  v_by_status jsonb;
  v_by_severity jsonb;
  v_by_event_type jsonb;
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
    'observations_closed', COUNT(*) FILTER (WHERE event_type = 'observation' AND status = 'closed')
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

  -- Monthly trend (last 6 months)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY month), '[]'::jsonb)
  INTO v_monthly_trend
  FROM (
    SELECT 
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE event_type != 'observation') as incidents,
      COUNT(*) FILTER (WHERE event_type = 'observation') as observations
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
    'actions_pending_verification', COUNT(*) FILTER (WHERE status = 'completed')
  ) INTO v_actions
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id 
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day');

  -- Get total investigations from investigations table
  v_summary := v_summary || jsonb_build_object(
    'total_investigations', (
      SELECT COUNT(*) FROM investigations 
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day')
    ),
    'investigations_open', (
      SELECT COUNT(*) FROM investigations 
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL AND status NOT IN ('completed', 'closed')
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day')
    ),
    'investigations_closed', (
      SELECT COUNT(*) FROM investigations 
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL AND status IN ('completed', 'closed')
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date + INTERVAL '1 day')
    )
  );

  v_result := jsonb_build_object(
    'summary', v_summary,
    'by_status', v_by_status,
    'by_severity', v_by_severity,
    'by_event_type', v_by_event_type,
    'monthly_trend', v_monthly_trend,
    'actions', v_actions
  );

  RETURN v_result;
END;
$function$;

-- Fix get_events_by_location function
CREATE OR REPLACE FUNCTION public.get_events_by_location(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
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