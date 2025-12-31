-- Drop ALL overloaded versions of these functions
DROP FUNCTION IF EXISTS public.get_dept_rep_events(text, text);
DROP FUNCTION IF EXISTS public.get_dept_rep_events(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_dept_rep_event_dashboard_stats();

-- Recreate get_dept_rep_event_dashboard_stats with CORRECT column name
CREATE OR REPLACE FUNCTION public.get_dept_rep_event_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;
  v_result JSON;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  -- Get user's assigned department from profiles
  SELECT assigned_department_id INTO v_dept_id
  FROM profiles
  WHERE id = v_user_id AND deleted_at IS NULL;
  
  -- If no department assigned, return zeros with flag
  IF v_dept_id IS NULL THEN
    RETURN json_build_object(
      'new_count', 0,
      'in_progress_count', 0,
      'overdue_count', 0,
      'total_count', 0,
      'has_department', false
    );
  END IF;
  
  -- Get counts for incidents in user's department
  -- Using i.department_id (NOT assigned_department_id)
  SELECT json_build_object(
    'new_count', COALESCE(SUM(CASE WHEN i.status IN ('submitted', 'pending_review', 'pending_dept_rep_approval', 'returned_to_reporter') THEN 1 ELSE 0 END), 0),
    'in_progress_count', COALESCE(SUM(CASE WHEN i.status IN ('investigation_pending', 'investigation_in_progress', 'observation_actions_pending', 'pending_closure', 'pending_manager_approval', 'pending_hsse_validation', 'pending_final_closure', 'expert_screening') THEN 1 ELSE 0 END), 0),
    'overdue_count', COALESCE(SUM(CASE WHEN EXISTS (
      SELECT 1 FROM corrective_actions ca 
      WHERE ca.source_id = i.id 
        AND ca.due_date < CURRENT_DATE 
        AND ca.status NOT IN ('completed', 'verified', 'closed')
        AND ca.deleted_at IS NULL
    ) THEN 1 ELSE 0 END), 0),
    'total_count', COUNT(*),
    'has_department', true
  ) INTO v_result
  FROM incidents i
  WHERE i.department_id = v_dept_id
    AND i.deleted_at IS NULL;
  
  RETURN v_result;
END;
$$;

-- Recreate get_dept_rep_events with CORRECT column name
CREATE OR REPLACE FUNCTION public.get_dept_rep_events(
  p_status TEXT DEFAULT 'all',
  p_search TEXT DEFAULT '',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
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
  days_overdue INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  -- Get user's assigned department from profiles
  SELECT assigned_department_id INTO v_dept_id
  FROM profiles
  WHERE profiles.id = v_user_id AND profiles.deleted_at IS NULL;
  
  -- If no department assigned, return empty
  IF v_dept_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return incidents for the department
  -- Using inc.department_id (NOT assigned_department_id)
  RETURN QUERY
  SELECT 
    inc.id,
    inc.reference_id,
    inc.title,
    inc.incident_type::TEXT AS event_type,
    inc.severity::TEXT,
    inc.status::TEXT,
    inc.reported_at,
    COALESCE(p.full_name, 'Unknown') AS reporter_name,
    COALESCE(d.name, 'Unknown') AS department_name,
    COALESCE((SELECT COUNT(*) FROM corrective_actions ca WHERE ca.source_id = inc.id AND ca.deleted_at IS NULL), 0) AS total_actions,
    COALESCE((SELECT COUNT(*) FROM corrective_actions ca WHERE ca.source_id = inc.id AND ca.status IN ('completed', 'verified', 'closed') AND ca.deleted_at IS NULL), 0) AS completed_actions,
    COALESCE((SELECT COUNT(*) FROM corrective_actions ca WHERE ca.source_id = inc.id AND ca.due_date < CURRENT_DATE AND ca.status NOT IN ('completed', 'verified', 'closed') AND ca.deleted_at IS NULL), 0) AS overdue_actions,
    (SELECT MIN(ca.due_date) FROM corrective_actions ca WHERE ca.source_id = inc.id AND ca.status NOT IN ('completed', 'verified', 'closed') AND ca.deleted_at IS NULL) AS earliest_due_date,
    CASE
      WHEN inc.status IN ('closed', 'investigation_closed') THEN 'completed'
      WHEN EXISTS (SELECT 1 FROM corrective_actions ca WHERE ca.source_id = inc.id AND ca.due_date < CURRENT_DATE AND ca.status NOT IN ('completed', 'verified', 'closed') AND ca.deleted_at IS NULL) THEN 'overdue'
      WHEN EXISTS (SELECT 1 FROM corrective_actions ca WHERE ca.source_id = inc.id AND ca.due_date <= CURRENT_DATE + INTERVAL '3 days' AND ca.status NOT IN ('completed', 'verified', 'closed') AND ca.deleted_at IS NULL) THEN 'at_risk'
      WHEN inc.status IN ('submitted', 'pending_review', 'pending_dept_rep_approval') THEN 'pending'
      ELSE 'on_track'
    END AS sla_status,
    COALESCE(
      (SELECT GREATEST(0, CURRENT_DATE - MIN(ca.due_date))::INTEGER 
       FROM corrective_actions ca 
       WHERE ca.source_id = inc.id 
         AND ca.due_date < CURRENT_DATE 
         AND ca.status NOT IN ('completed', 'verified', 'closed') 
         AND ca.deleted_at IS NULL),
      0
    ) AS days_overdue
  FROM incidents inc
  LEFT JOIN profiles p ON inc.reporter_id = p.id
  LEFT JOIN departments d ON inc.department_id = d.id
  WHERE inc.department_id = v_dept_id
    AND inc.deleted_at IS NULL
    AND (
      p_status = 'all'
      OR (p_status = 'pending' AND inc.status IN ('submitted', 'pending_review', 'pending_dept_rep_approval', 'returned_to_reporter'))
      OR (p_status = 'in_progress' AND inc.status IN ('investigation_pending', 'investigation_in_progress', 'observation_actions_pending', 'pending_closure', 'pending_manager_approval', 'pending_hsse_validation', 'pending_final_closure', 'expert_screening'))
      OR (p_status = 'completed' AND inc.status IN ('closed', 'investigation_closed'))
      OR (p_status = 'overdue' AND EXISTS (
        SELECT 1 FROM corrective_actions ca 
        WHERE ca.source_id = inc.id 
          AND ca.due_date < CURRENT_DATE 
          AND ca.status NOT IN ('completed', 'verified', 'closed')
          AND ca.deleted_at IS NULL
      ))
    )
    AND (
      p_search = '' 
      OR inc.title ILIKE '%' || p_search || '%'
      OR inc.reference_id ILIKE '%' || p_search || '%'
    )
  ORDER BY inc.reported_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_dept_rep_event_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dept_rep_events(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;