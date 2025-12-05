
-- Update get_users_with_roles_paginated to support search functionality
CREATE OR REPLACE FUNCTION public.get_users_with_roles_paginated(
  p_tenant_id uuid, 
  p_user_type text DEFAULT NULL::text, 
  p_is_active boolean DEFAULT NULL::boolean, 
  p_branch_id uuid DEFAULT NULL::uuid, 
  p_division_id uuid DEFAULT NULL::uuid, 
  p_role_code text DEFAULT NULL::text, 
  p_search_term text DEFAULT NULL::text,
  p_offset integer DEFAULT 0, 
  p_limit integer DEFAULT 25
)
 RETURNS TABLE(id uuid, full_name text, phone_number text, user_type text, has_login boolean, is_active boolean, employee_id text, job_title text, assigned_branch_id uuid, branch_name text, assigned_division_id uuid, division_name text, assigned_department_id uuid, department_name text, assigned_section_id uuid, section_name text, role_assignments jsonb, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND (p_search_term IS NULL OR p_search_term = '' OR (
        p.full_name ILIKE '%' || p_search_term || '%' OR
        p.employee_id ILIKE '%' || p_search_term || '%' OR
        p.phone_number ILIKE '%' || p_search_term || '%'
      ))
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
$function$;
