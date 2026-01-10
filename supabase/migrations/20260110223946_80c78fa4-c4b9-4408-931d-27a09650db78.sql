-- Replace get_hsse_contact_for_location with site-first priority and organization fallback
CREATE OR REPLACE FUNCTION public.get_hsse_contact_for_location(
  p_branch_id uuid DEFAULT NULL,
  p_site_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  full_name text, 
  phone_number text, 
  role_name text, 
  role_code text, 
  avatar_url text,
  match_scope text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  v_tenant_id := public.get_auth_tenant_id();
  
  -- PRIORITY 1: HSSE contact in same SITE
  IF p_site_id IS NOT NULL THEN
    RETURN QUERY
    SELECT DISTINCT ON (p.id)
      p.id,
      p.full_name,
      p.phone_number,
      r.name as role_name,
      r.code as role_code,
      p.avatar_url,
      'site'::text as match_scope
    FROM profiles p
    JOIN user_role_assignments ura ON p.id = ura.user_id AND ura.deleted_at IS NULL
    JOIN roles r ON ura.role_id = r.id
    WHERE p.assigned_site_id = p_site_id
      AND r.code IN ('hsse_officer', 'hsse_expert', 'hsse_manager')
      AND p.is_active = true 
      AND p.deleted_at IS NULL
      AND p.tenant_id = v_tenant_id
    ORDER BY p.id, (CASE r.code 
      WHEN 'hsse_officer' THEN 1 
      WHEN 'hsse_expert' THEN 2 
      WHEN 'hsse_manager' THEN 3 END)
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- PRIORITY 2: HSSE contact in same BRANCH
  IF p_branch_id IS NOT NULL THEN
    RETURN QUERY
    SELECT DISTINCT ON (p.id)
      p.id,
      p.full_name,
      p.phone_number,
      r.name as role_name,
      r.code as role_code,
      p.avatar_url,
      'branch'::text as match_scope
    FROM profiles p
    JOIN user_role_assignments ura ON p.id = ura.user_id AND ura.deleted_at IS NULL
    JOIN roles r ON ura.role_id = r.id
    WHERE p.assigned_branch_id = p_branch_id
      AND r.code IN ('hsse_officer', 'hsse_expert', 'hsse_manager')
      AND p.is_active = true 
      AND p.deleted_at IS NULL
      AND p.tenant_id = v_tenant_id
    ORDER BY p.id, (CASE r.code 
      WHEN 'hsse_officer' THEN 1 
      WHEN 'hsse_expert' THEN 2 
      WHEN 'hsse_manager' THEN 3 END)
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- PRIORITY 3: ANY HSSE contact in ORGANIZATION (tenant-wide fallback)
  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id,
    p.full_name,
    p.phone_number,
    r.name as role_name,
    r.code as role_code,
    p.avatar_url,
    'organization'::text as match_scope
  FROM profiles p
  JOIN user_role_assignments ura ON p.id = ura.user_id AND ura.deleted_at IS NULL
  JOIN roles r ON ura.role_id = r.id
  WHERE r.code IN ('hsse_officer', 'hsse_expert', 'hsse_manager')
    AND p.is_active = true 
    AND p.deleted_at IS NULL
    AND p.tenant_id = v_tenant_id
  ORDER BY p.id, (CASE r.code 
    WHEN 'hsse_officer' THEN 1 
    WHEN 'hsse_expert' THEN 2 
    WHEN 'hsse_manager' THEN 3 END)
  LIMIT 1;
END;
$$;