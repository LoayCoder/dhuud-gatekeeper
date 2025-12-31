-- Drop and recreate get_dept_rep_event_dashboard_stats with corrected status mappings
DROP FUNCTION IF EXISTS public.get_dept_rep_event_dashboard_stats();

CREATE OR REPLACE FUNCTION public.get_dept_rep_event_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_department_id UUID;
  v_new_count INT := 0;
  v_in_progress_count INT := 0;
  v_overdue_count INT := 0;
  v_total_count INT := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get user's assigned department
  SELECT assigned_department_id INTO v_department_id
  FROM profiles
  WHERE id = v_user_id AND deleted_at IS NULL;
  
  -- If no department assigned, return zeros
  IF v_department_id IS NULL THEN
    RETURN json_build_object(
      'new_count', 0,
      'in_progress_count', 0,
      'overdue_count', 0,
      'total_count', 0,
      'has_department', false
    );
  END IF;
  
  -- Count NEW incidents (submitted, pending review, pending dept rep approval)
  SELECT COUNT(*) INTO v_new_count
  FROM incidents i
  WHERE i.department_id = v_department_id
    AND i.deleted_at IS NULL
    AND i.status IN ('submitted', 'pending_review', 'pending_dept_rep_approval');
  
  -- Count IN PROGRESS incidents (investigation stages)
  SELECT COUNT(*) INTO v_in_progress_count
  FROM incidents i
  WHERE i.department_id = v_department_id
    AND i.deleted_at IS NULL
    AND i.status IN ('investigation_pending', 'investigation_in_progress', 'observation_actions_pending', 'pending_closure');
  
  -- Count OVERDUE (incidents with overdue corrective actions)
  SELECT COUNT(DISTINCT i.id) INTO v_overdue_count
  FROM incidents i
  INNER JOIN corrective_actions ca ON ca.incident_id = i.id AND ca.deleted_at IS NULL
  WHERE i.department_id = v_department_id
    AND i.deleted_at IS NULL
    AND ca.status NOT IN ('completed', 'cancelled', 'verified')
    AND ca.due_date < CURRENT_DATE;
  
  -- Count TOTAL active incidents (exclude closed/cancelled)
  SELECT COUNT(*) INTO v_total_count
  FROM incidents i
  WHERE i.department_id = v_department_id
    AND i.deleted_at IS NULL
    AND i.status NOT IN ('closed', 'cancelled', 'no_investigation_required');
  
  RETURN json_build_object(
    'new_count', v_new_count,
    'in_progress_count', v_in_progress_count,
    'overdue_count', v_overdue_count,
    'total_count', v_total_count,
    'has_department', true
  );
END;
$$;

-- Drop and recreate get_dept_rep_events with corrected status mappings
DROP FUNCTION IF EXISTS public.get_dept_rep_events(TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.get_dept_rep_events(
  p_status TEXT DEFAULT 'all',
  p_search TEXT DEFAULT '',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  reference_id TEXT,
  title TEXT,
  event_type TEXT,
  severity TEXT,
  status TEXT,
  reported_at TIMESTAMPTZ,
  reporter_name TEXT,
  department_name TEXT,
  total_actions BIGINT,
  completed_actions BIGINT,
  overdue_actions BIGINT,
  earliest_due_date DATE,
  sla_status TEXT,
  days_overdue INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_department_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get user's assigned department
  SELECT assigned_department_id INTO v_department_id
  FROM profiles
  WHERE profiles.id = v_user_id AND deleted_at IS NULL;
  
  -- If no department, return empty
  IF v_department_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH action_stats AS (
    SELECT 
      ca.incident_id,
      COUNT(*) AS total_actions,
      COUNT(*) FILTER (WHERE ca.status IN ('completed', 'verified')) AS completed_actions,
      COUNT(*) FILTER (WHERE ca.status NOT IN ('completed', 'cancelled', 'verified') AND ca.due_date < CURRENT_DATE) AS overdue_actions,
      MIN(ca.due_date) FILTER (WHERE ca.status NOT IN ('completed', 'cancelled', 'verified')) AS earliest_due_date
    FROM corrective_actions ca
    WHERE ca.deleted_at IS NULL
    GROUP BY ca.incident_id
  )
  SELECT 
    i.id,
    i.reference_id,
    i.title,
    i.incident_type::TEXT AS event_type,
    i.severity::TEXT AS severity,
    i.status::TEXT AS status,
    i.created_at AS reported_at,
    COALESCE(p.full_name, 'Unknown') AS reporter_name,
    COALESCE(d.name, 'Unknown') AS department_name,
    COALESCE(ast.total_actions, 0::BIGINT) AS total_actions,
    COALESCE(ast.completed_actions, 0::BIGINT) AS completed_actions,
    COALESCE(ast.overdue_actions, 0::BIGINT) AS overdue_actions,
    ast.earliest_due_date,
    CASE
      WHEN ast.overdue_actions > 0 THEN 'overdue'
      WHEN ast.earliest_due_date IS NOT NULL AND ast.earliest_due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'at_risk'
      WHEN ast.total_actions > 0 AND ast.completed_actions = ast.total_actions THEN 'completed'
      WHEN ast.total_actions = 0 THEN 'pending'
      ELSE 'on_track'
    END AS sla_status,
    CASE
      WHEN ast.earliest_due_date < CURRENT_DATE THEN (CURRENT_DATE - ast.earliest_due_date)::INT
      ELSE 0
    END AS days_overdue
  FROM incidents i
  LEFT JOIN profiles p ON p.id = i.reporter_id
  LEFT JOIN departments d ON d.id = i.department_id
  LEFT JOIN action_stats ast ON ast.incident_id = i.id
  WHERE i.department_id = v_department_id
    AND i.deleted_at IS NULL
    AND (
      p_status = 'all'
      OR (p_status = 'pending' AND i.status IN ('draft', 'submitted', 'pending_review', 'pending_dept_rep_approval'))
      OR (p_status = 'in_progress' AND i.status IN ('investigation_pending', 'investigation_in_progress', 'observation_actions_pending', 'pending_closure'))
      OR (p_status = 'completed' AND i.status IN ('closed', 'investigation_closed', 'no_investigation_required', 'cancelled'))
      OR (p_status = 'overdue' AND ast.overdue_actions > 0)
    )
    AND (
      p_search = ''
      OR i.reference_id ILIKE '%' || p_search || '%'
      OR i.title ILIKE '%' || p_search || '%'
      OR p.full_name ILIKE '%' || p_search || '%'
    )
  ORDER BY i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_dept_rep_event_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dept_rep_events(TEXT, TEXT, INT, INT) TO authenticated;