-- =====================================================
-- DATA ISOLATION AUDIT FIXES
-- =====================================================
-- This migration secures functions identified as having potential
-- cross-tenant data leaks by enforcing strict tenant isolation.

-- 1. Secure get_team_hierarchy_with_profiles
-- Enforce that the target manager belongs to the same tenant
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_tenant_id uuid;
  v_auth_tenant_id uuid;
BEGIN
  -- Get current user's tenant
  v_auth_tenant_id := public.get_auth_tenant_id();

  -- Get target manager's tenant
  SELECT tenant_id INTO v_target_tenant_id FROM profiles WHERE id = p_manager_id;

  -- Validation: Must be same tenant or Super Admin
  IF v_target_tenant_id IS NOT NULL
     AND v_target_tenant_id IS DISTINCT FROM v_auth_tenant_id
     AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access team hierarchy of another tenant';
  END IF;

  RETURN QUERY
  WITH RECURSIVE team_hierarchy AS (
    SELECT mt.user_id, 1 as depth
    FROM manager_team mt
    WHERE mt.manager_id = p_manager_id AND mt.tenant_id = v_auth_tenant_id
    UNION ALL
    SELECT mt.user_id, th.depth + 1
    FROM manager_team mt
    INNER JOIN team_hierarchy th ON mt.manager_id = th.user_id
    WHERE th.depth < 10 AND mt.tenant_id = v_auth_tenant_id
  )
  SELECT DISTINCT ON (th.user_id)
    th.user_id,
    th.depth,
    p.full_name,
    p.job_title,
    p.user_type::text,
    p.is_active,
    EXISTS(SELECT 1 FROM manager_team m WHERE m.manager_id = th.user_id AND m.tenant_id = v_auth_tenant_id) as is_manager
  FROM team_hierarchy th
  LEFT JOIN profiles p ON p.id = th.user_id AND p.tenant_id = v_auth_tenant_id
  ORDER BY th.user_id, th.depth;
END;
$$;

-- 2. Secure get_users_with_roles_paginated
-- Enforce p_tenant_id matches auth tenant
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
  -- Validation: Strict Tenant Isolation
  IF p_tenant_id IS DISTINCT FROM public.get_auth_tenant_id()
     AND NOT public.is_super_admin(auth.uid()) THEN
     RAISE EXCEPTION 'Unauthorized: Access denied to tenant %', p_tenant_id;
  END IF;

  RETURN QUERY
  WITH filtered_users AS (
    SELECT DISTINCT p.*
    FROM profiles p
    LEFT JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.tenant_id = p_tenant_id
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
      WHERE ura2.user_id = fu.id AND ura2.tenant_id = p_tenant_id),
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

-- 3. Secure get_department_pending_gate_passes
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validation: Strict Tenant Isolation
  IF p_tenant_id IS DISTINCT FROM public.get_auth_tenant_id()
     AND NOT public.is_super_admin(auth.uid()) THEN
     RAISE EXCEPTION 'Unauthorized: Access denied to tenant %', p_tenant_id;
  END IF;

  RETURN QUERY
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
    AND cp.tenant_id = p_tenant_id
    AND mgp.status = 'pending'
    AND mgp.deleted_at IS NULL
  ORDER BY mgp.created_at ASC
  LIMIT p_limit;
END;
$$;

-- 4. Secure get_department_upcoming_gate_passes
CREATE OR REPLACE FUNCTION public.get_department_upcoming_gate_passes(
  p_department_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE(
  pass_date DATE,
  pass_count BIGINT,
  top_project TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validation: Strict Tenant Isolation
  IF p_tenant_id IS DISTINCT FROM public.get_auth_tenant_id()
     AND NOT public.is_super_admin(auth.uid()) THEN
     RAISE EXCEPTION 'Unauthorized: Access denied to tenant %', p_tenant_id;
  END IF;

  RETURN QUERY
  WITH daily_counts AS (
    SELECT
      mgp.pass_date,
      cp.project_name,
      COUNT(*) as cnt
    FROM material_gate_passes mgp
    JOIN contractor_projects cp ON cp.id = mgp.project_id
    WHERE cp.department_id = p_department_id
      AND mgp.tenant_id = p_tenant_id
      AND cp.tenant_id = p_tenant_id
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
END;
$$;
