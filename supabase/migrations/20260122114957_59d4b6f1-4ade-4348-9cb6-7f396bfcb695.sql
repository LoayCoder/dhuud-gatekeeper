-- Fix the pending gate passes function with correct column names
CREATE OR REPLACE FUNCTION public.get_department_pending_gate_passes(
  p_department_id UUID,
  p_tenant_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  reference_number TEXT,
  project_name TEXT,
  requester_name TEXT,
  material_description TEXT,
  pass_date DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    mgp.id,
    mgp.reference_number,
    cp.project_name as project_name,
    p.full_name as requester_name,
    mgp.material_description,
    mgp.pass_date,
    mgp.created_at
  FROM material_gate_passes mgp
  JOIN contractor_projects cp ON cp.id = mgp.project_id
  LEFT JOIN profiles p ON p.id = mgp.requested_by
  WHERE cp.department_id = p_department_id
    AND mgp.tenant_id = p_tenant_id
    AND mgp.status = 'pending'
    AND mgp.deleted_at IS NULL
  ORDER BY mgp.created_at ASC
  LIMIT p_limit;
$$;

-- Fix the upcoming gate passes function with correct column names
CREATE OR REPLACE FUNCTION public.get_department_upcoming_gate_passes(
  p_department_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE(
  pass_date DATE,
  pass_count BIGINT,
  top_project TEXT
)
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  WITH daily_counts AS (
    SELECT 
      mgp.pass_date,
      cp.project_name,
      COUNT(*) as cnt
    FROM material_gate_passes mgp
    JOIN contractor_projects cp ON cp.id = mgp.project_id
    WHERE cp.department_id = p_department_id
      AND mgp.tenant_id = p_tenant_id
      AND mgp.pass_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND mgp.status IN ('pending', 'approved')
      AND mgp.deleted_at IS NULL
    GROUP BY mgp.pass_date, cp.project_name
  ),
  daily_summary AS (
    SELECT 
      dc.pass_date,
      SUM(dc.cnt) as pass_count,
      (SELECT dc2.project_name FROM daily_counts dc2 
       WHERE dc2.pass_date = dc.pass_date 
       ORDER BY dc2.cnt DESC LIMIT 1) as top_project
    FROM daily_counts dc
    GROUP BY dc.pass_date
  )
  SELECT ds.pass_date, ds.pass_count, ds.top_project
  FROM daily_summary ds
  ORDER BY ds.pass_date;
$$;