-- Create RPC function to fetch department representative events with filters and SLA status
CREATE OR REPLACE FUNCTION public.get_dept_rep_events(
  p_status text DEFAULT 'all',
  p_search text DEFAULT '',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  reference_id text,
  title text,
  event_type text,
  severity text,
  status text,
  reported_at timestamptz,
  reporter_name text,
  department_name text,
  total_actions int,
  completed_actions int,
  overdue_actions int,
  earliest_due_date date,
  sla_status text,
  days_overdue int
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_dept_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get user's department
  SELECT p.department_id INTO v_dept_id
  FROM profiles p
  WHERE p.id = v_user_id AND p.deleted_at IS NULL;

  IF v_dept_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH action_stats AS (
    SELECT 
      ca.incident_id,
      COUNT(*)::int AS total_actions,
      COUNT(*) FILTER (WHERE ca.status = 'completed')::int AS completed_actions,
      COUNT(*) FILTER (WHERE ca.status != 'completed' AND ca.due_date < CURRENT_DATE)::int AS overdue_actions,
      MIN(ca.due_date) FILTER (WHERE ca.status != 'completed') AS earliest_due_date
    FROM corrective_actions ca
    WHERE ca.deleted_at IS NULL
    GROUP BY ca.incident_id
  )
  SELECT 
    i.id,
    i.reference_id,
    i.title,
    i.event_type,
    i.severity,
    i.status,
    i.created_at AS reported_at,
    COALESCE(rp.full_name, 'Unknown') AS reporter_name,
    COALESCE(d.name, 'Unknown') AS department_name,
    COALESCE(ast.total_actions, 0) AS total_actions,
    COALESCE(ast.completed_actions, 0) AS completed_actions,
    COALESCE(ast.overdue_actions, 0) AS overdue_actions,
    ast.earliest_due_date,
    CASE 
      WHEN COALESCE(ast.overdue_actions, 0) > 0 THEN 'overdue'
      WHEN ast.earliest_due_date IS NOT NULL AND ast.earliest_due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'at_risk'
      WHEN i.status IN ('open', 'pending_dept_rep_approval', 'investigating') THEN 'on_track'
      WHEN i.status = 'closed' THEN 'completed'
      ELSE 'pending'
    END AS sla_status,
    CASE 
      WHEN ast.earliest_due_date IS NOT NULL AND ast.earliest_due_date < CURRENT_DATE 
      THEN (CURRENT_DATE - ast.earliest_due_date)::int
      ELSE 0
    END AS days_overdue
  FROM incidents i
  LEFT JOIN profiles rp ON i.reported_by = rp.id
  LEFT JOIN departments d ON i.department_id = d.id
  LEFT JOIN action_stats ast ON i.id = ast.incident_id
  WHERE i.deleted_at IS NULL
    AND i.department_id = v_dept_id
    -- Status filter
    AND (
      p_status = 'all' 
      OR (p_status = 'pending' AND i.status IN ('open', 'pending_dept_rep_approval'))
      OR (p_status = 'in_progress' AND i.status = 'investigating')
      OR (p_status = 'overdue' AND COALESCE(ast.overdue_actions, 0) > 0)
      OR (p_status = 'completed' AND i.status = 'closed')
    )
    -- Search filter
    AND (
      p_search = '' 
      OR i.reference_id ILIKE '%' || p_search || '%'
      OR i.title ILIKE '%' || p_search || '%'
    )
  ORDER BY 
    CASE WHEN COALESCE(ast.overdue_actions, 0) > 0 THEN 0 ELSE 1 END,
    i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dept_rep_events(text, text, int, int) TO authenticated;