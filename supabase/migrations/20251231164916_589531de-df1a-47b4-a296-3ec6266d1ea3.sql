-- Drop and recreate functions with valid incident_status enum values only

DROP FUNCTION IF EXISTS public.get_dept_rep_events(text, text);
DROP FUNCTION IF EXISTS public.get_dept_rep_event_dashboard_stats();

-- Recreate get_dept_rep_event_dashboard_stats with valid enum values
CREATE OR REPLACE FUNCTION public.get_dept_rep_event_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_department_id UUID;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := get_auth_tenant_id();
  
  SELECT assigned_department_id INTO v_department_id
  FROM profiles WHERE id = v_user_id;
  
  IF v_department_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_department', false,
      'total_count', 0,
      'new_count', 0,
      'in_progress_count', 0,
      'overdue_count', 0
    );
  END IF;
  
  SELECT jsonb_build_object(
    'has_department', true,
    'total_count', COUNT(*)::BIGINT,
    'new_count', COUNT(*) FILTER (WHERE i.status IN ('submitted', 'pending_review', 'pending_dept_rep_approval', 'returned_to_reporter'))::BIGINT,
    'in_progress_count', COUNT(*) FILTER (WHERE i.status IN ('investigation_pending', 'investigation_in_progress', 'observation_actions_pending', 'pending_closure', 'pending_manager_approval', 'pending_hsse_validation', 'pending_final_closure', 'expert_screening'))::BIGINT,
    'overdue_count', (
      SELECT COUNT(*)::BIGINT
      FROM corrective_actions ca
      JOIN incidents inc ON ca.incident_id = inc.id
      WHERE inc.tenant_id = v_tenant_id
        AND inc.deleted_at IS NULL
        AND inc.assigned_department_id = v_department_id
        AND ca.deleted_at IS NULL
        AND ca.due_date < CURRENT_DATE
        AND ca.status NOT IN ('completed', 'verified', 'closed')
    )
  ) INTO v_result
  FROM incidents i
  WHERE i.tenant_id = v_tenant_id
    AND i.deleted_at IS NULL
    AND i.assigned_department_id = v_department_id;
  
  RETURN v_result;
END;
$function$;

-- Recreate get_dept_rep_events with valid enum values
CREATE OR REPLACE FUNCTION public.get_dept_rep_events(
  p_status text DEFAULT 'all',
  p_search text DEFAULT ''
)
RETURNS TABLE(
  id UUID,
  reference_id TEXT,
  title TEXT,
  event_type TEXT,
  severity TEXT,
  status TEXT,
  reporter_name TEXT,
  reported_at TIMESTAMPTZ,
  total_actions BIGINT,
  completed_actions BIGINT,
  overdue_actions BIGINT,
  sla_status TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_department_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := get_auth_tenant_id();
  
  SELECT assigned_department_id INTO v_department_id
  FROM profiles WHERE id = v_user_id;
  
  IF v_department_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id,
    i.reference_id,
    i.title,
    i.event_type::TEXT,
    COALESCE(i.severity, 'medium')::TEXT as severity,
    i.status::TEXT,
    COALESCE(p.full_name, 'Unknown')::TEXT as reporter_name,
    i.created_at as reported_at,
    COALESCE(action_stats.total, 0)::BIGINT as total_actions,
    COALESCE(action_stats.completed, 0)::BIGINT as completed_actions,
    COALESCE(action_stats.overdue, 0)::BIGINT as overdue_actions,
    CASE 
      WHEN COALESCE(action_stats.overdue, 0) > 0 THEN 'overdue'
      WHEN i.status IN ('closed', 'investigation_closed', 'no_investigation_required') THEN 'completed'
      ELSE 'on_track'
    END::TEXT as sla_status
  FROM incidents i
  LEFT JOIN profiles p ON i.reporter_id = p.id
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*)::BIGINT as total,
      COUNT(*) FILTER (WHERE ca.status IN ('completed', 'verified', 'closed'))::BIGINT as completed,
      COUNT(*) FILTER (WHERE ca.due_date < CURRENT_DATE AND ca.status NOT IN ('completed', 'verified', 'closed'))::BIGINT as overdue
    FROM corrective_actions ca
    WHERE ca.incident_id = i.id AND ca.deleted_at IS NULL
  ) action_stats ON true
  WHERE i.tenant_id = v_tenant_id
    AND i.deleted_at IS NULL
    AND i.assigned_department_id = v_department_id
    AND (
      p_status = 'all'
      OR (p_status = 'pending' AND i.status IN ('submitted', 'pending_review', 'pending_dept_rep_approval', 'returned_to_reporter'))
      OR (p_status = 'in_progress' AND i.status IN ('investigation_pending', 'investigation_in_progress', 'observation_actions_pending', 'pending_closure', 'pending_manager_approval', 'pending_hsse_validation', 'pending_final_closure', 'expert_screening'))
      OR (p_status = 'completed' AND i.status IN ('closed', 'investigation_closed', 'no_investigation_required'))
      OR (p_status = 'overdue' AND COALESCE(action_stats.overdue, 0) > 0)
    )
    AND (
      p_search = ''
      OR i.reference_id ILIKE '%' || p_search || '%'
      OR i.title ILIKE '%' || p_search || '%'
    )
  ORDER BY i.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dept_rep_event_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dept_rep_events(text, text) TO authenticated;