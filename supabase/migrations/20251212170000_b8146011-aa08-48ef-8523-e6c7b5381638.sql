-- Drop and recreate the HSSE event dashboard stats function with accurate status mapping
CREATE OR REPLACE FUNCTION public.get_hsse_event_dashboard_stats(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  -- Default to last 30 days if no date range provided
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  SELECT jsonb_build_object(
    'summary', (
      SELECT jsonb_build_object(
        'total_events', COUNT(*),
        'total_incidents', COUNT(*) FILTER (WHERE event_type != 'observation'),
        'total_observations', COUNT(*) FILTER (WHERE event_type = 'observation'),
        'open_investigations', COUNT(*) FILTER (WHERE status IN ('investigation_in_progress', 'investigation_pending')),
        'pending_closure', COUNT(*) FILTER (WHERE status IN ('pending_closure', 'pending_final_closure')),
        'closed_this_month', COUNT(*) FILTER (WHERE status = 'closed' AND DATE_TRUNC('month', closure_approved_at) = DATE_TRUNC('month', CURRENT_DATE)),
        'avg_closure_days', ROUND(AVG(EXTRACT(EPOCH FROM (closure_approved_at - created_at)) / 86400)::numeric, 1) FILTER (WHERE status = 'closed' AND closure_approved_at IS NOT NULL)
      )
      FROM incidents
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND created_at::date >= v_start_date 
        AND created_at::date <= v_end_date
    ),
    'by_status', (
      SELECT jsonb_build_object(
        'submitted', COUNT(*) FILTER (WHERE status = 'submitted'),
        'expert_screening', COUNT(*) FILTER (WHERE status = 'expert_screening'),
        'pending_manager_approval', COUNT(*) FILTER (WHERE status IN ('pending_manager_approval', 'pending_dept_rep_approval')),
        'investigation_in_progress', COUNT(*) FILTER (WHERE status IN ('investigation_in_progress', 'investigation_pending')),
        'pending_closure', COUNT(*) FILTER (WHERE status IN ('pending_closure', 'pending_final_closure', 'investigation_closed')),
        'closed', COUNT(*) FILTER (WHERE status = 'closed'),
        'returned', COUNT(*) FILTER (WHERE status = 'returned_to_reporter'),
        'rejected', COUNT(*) FILTER (WHERE status IN ('expert_rejected', 'manager_rejected', 'no_investigation_required'))
      )
      FROM incidents
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND created_at::date >= v_start_date 
        AND created_at::date <= v_end_date
    ),
    'by_severity', (
      SELECT jsonb_build_object(
        'critical', COUNT(*) FILTER (WHERE severity = 'critical'),
        'high', COUNT(*) FILTER (WHERE severity = 'high'),
        'medium', COUNT(*) FILTER (WHERE severity = 'medium'),
        'low', COUNT(*) FILTER (WHERE severity = 'low'),
        'unassigned', COUNT(*) FILTER (WHERE severity IS NULL AND event_type != 'observation')
      )
      FROM incidents
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND created_at::date >= v_start_date 
        AND created_at::date <= v_end_date
    ),
    'by_event_type', (
      SELECT jsonb_build_object(
        'observation', COUNT(*) FILTER (WHERE event_type = 'observation'),
        'incident', COUNT(*) FILTER (WHERE event_type = 'incident'),
        'near_miss', COUNT(*) FILTER (WHERE event_type = 'near_miss' OR subtype = 'near_miss'),
        'security_event', COUNT(*) FILTER (WHERE event_type = 'security_event' OR subtype = 'security'),
        'environmental_event', COUNT(*) FILTER (WHERE event_type = 'environmental_event' OR subtype = 'environmental')
      )
      FROM incidents
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND created_at::date >= v_start_date 
        AND created_at::date <= v_end_date
    ),
    'monthly_trend', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY month), '[]'::jsonb)
      FROM (
        SELECT 
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE event_type != 'observation') as incidents,
          COUNT(*) FILTER (WHERE event_type = 'observation') as observations
        FROM incidents
        WHERE tenant_id = v_tenant_id 
          AND deleted_at IS NULL
          AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
      ) row_data
    ),
    'actions', (
      SELECT jsonb_build_object(
        'open_actions', COUNT(*) FILTER (WHERE status NOT IN ('verified', 'closed', 'rejected') AND deleted_at IS NULL),
        'overdue_actions', COUNT(*) FILTER (WHERE status NOT IN ('verified', 'closed', 'rejected') AND deleted_at IS NULL AND due_date < CURRENT_DATE),
        'critical_actions', COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('verified', 'closed', 'rejected') AND deleted_at IS NULL),
        'high_priority_actions', COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('verified', 'closed', 'rejected') AND deleted_at IS NULL)
      )
      FROM corrective_actions
      WHERE tenant_id = v_tenant_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$function$;

-- Create function to get recent events for dashboard
CREATE OR REPLACE FUNCTION public.get_recent_hsse_events(p_limit INTEGER DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  RETURN (
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
    FROM (
      SELECT 
        id,
        reference_id,
        SUBSTRING(description, 1, 100) as description_preview,
        event_type,
        subtype,
        status,
        severity,
        created_at,
        occurred_at
      FROM incidents
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT p_limit
    ) row_data
  );
END;
$function$;

-- Create function to get quick action counts for dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_quick_action_counts()
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_pending_approvals INTEGER := 0;
  v_open_investigations INTEGER := 0;
  v_overdue_actions INTEGER := 0;
  v_my_actions INTEGER := 0;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  v_user_id := auth.uid();
  
  -- Pending approvals for this user
  SELECT COUNT(*) INTO v_pending_approvals
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (
      (status = 'pending_manager_approval' AND approval_manager_id = v_user_id)
      OR (status = 'pending_dept_rep_approval' AND approval_manager_id = v_user_id)
      OR (status IN ('pending_closure', 'pending_final_closure') AND EXISTS (
        SELECT 1 FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = v_user_id AND r.code = 'hsse_manager'
      ))
    );
  
  -- Open investigations
  SELECT COUNT(*) INTO v_open_investigations
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND status IN ('investigation_in_progress', 'investigation_pending');
  
  -- Overdue actions
  SELECT COUNT(*) INTO v_overdue_actions
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND status NOT IN ('verified', 'closed', 'rejected')
    AND due_date < CURRENT_DATE;
  
  -- My actions
  SELECT COUNT(*) INTO v_my_actions
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND assigned_to = v_user_id
    AND status NOT IN ('verified', 'closed', 'rejected');
  
  RETURN jsonb_build_object(
    'pending_approvals', v_pending_approvals,
    'open_investigations', v_open_investigations,
    'overdue_actions', v_overdue_actions,
    'my_actions', v_my_actions
  );
END;
$function$;