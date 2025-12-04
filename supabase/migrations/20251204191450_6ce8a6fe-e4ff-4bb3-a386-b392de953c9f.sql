-- Fix #2: Optimized team hierarchy with profiles in single query
CREATE OR REPLACE FUNCTION public.get_team_hierarchy_with_profiles(p_manager_id uuid)
RETURNS TABLE(
  user_id uuid, 
  depth integer, 
  full_name text, 
  job_title text, 
  user_type text, 
  is_active boolean,
  is_manager boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE team_hierarchy AS (
    SELECT mt.user_id, 1 as depth
    FROM manager_team mt
    WHERE mt.manager_id = p_manager_id
    UNION ALL
    SELECT mt.user_id, th.depth + 1
    FROM manager_team mt
    INNER JOIN team_hierarchy th ON mt.manager_id = th.user_id
    WHERE th.depth < 10
  )
  SELECT DISTINCT ON (th.user_id)
    th.user_id,
    th.depth,
    p.full_name,
    p.job_title,
    p.user_type::text,
    p.is_active,
    EXISTS(SELECT 1 FROM manager_team m WHERE m.manager_id = th.user_id) as is_manager
  FROM team_hierarchy th
  LEFT JOIN profiles p ON p.id = th.user_id
  ORDER BY th.user_id, th.depth;
$$;

-- Fix #3: Server-side paginated users with role filtering
CREATE OR REPLACE FUNCTION public.get_users_with_roles_paginated(
  p_tenant_id uuid,
  p_user_type text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_division_id uuid DEFAULT NULL,
  p_role_code text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 25
)
RETURNS TABLE(
  id uuid,
  full_name text,
  phone_number text,
  user_type text,
  has_login boolean,
  is_active boolean,
  employee_id text,
  job_title text,
  assigned_branch_id uuid,
  branch_name text,
  assigned_division_id uuid,
  division_name text,
  assigned_department_id uuid,
  department_name text,
  assigned_section_id uuid,
  section_name text,
  role_assignments jsonb,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_users AS (
    SELECT DISTINCT p.*
    FROM profiles p
    LEFT JOIN user_role_assignments ura ON ura.user_id = p.id
    LEFT JOIN roles r ON r.id = ura.role_id
    WHERE p.tenant_id = p_tenant_id
      AND (p.is_deleted IS NULL OR p.is_deleted = false)
      AND (p_user_type IS NULL OR p.user_type::text = p_user_type)
      AND (p_is_active IS NULL OR p.is_active = p_is_active)
      AND (p_branch_id IS NULL OR p.assigned_branch_id = p_branch_id)
      AND (p_division_id IS NULL OR p.assigned_division_id = p_division_id)
      AND (p_role_code IS NULL OR r.code = p_role_code)
  ),
  counted AS (
    SELECT COUNT(*) as cnt FROM filtered_users
  )
  SELECT 
    fu.id,
    fu.full_name,
    fu.phone_number,
    fu.user_type::text,
    fu.has_login,
    fu.is_active,
    fu.employee_id,
    fu.job_title,
    fu.assigned_branch_id,
    b.name as branch_name,
    fu.assigned_division_id,
    d.name as division_name,
    fu.assigned_department_id,
    dep.name as department_name,
    fu.assigned_section_id,
    s.name as section_name,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'role_id', ura2.role_id,
        'role_code', r2.code,
        'role_name', r2.name,
        'category', r2.category
      ))
      FROM user_role_assignments ura2
      JOIN roles r2 ON r2.id = ura2.role_id
      WHERE ura2.user_id = fu.id),
      '[]'::jsonb
    ) as role_assignments,
    (SELECT cnt FROM counted) as total_count
  FROM filtered_users fu
  LEFT JOIN branches b ON b.id = fu.assigned_branch_id
  LEFT JOIN divisions d ON d.id = fu.assigned_division_id
  LEFT JOIN departments dep ON dep.id = fu.assigned_department_id
  LEFT JOIN sections s ON s.id = fu.assigned_section_id
  ORDER BY fu.full_name ASC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;