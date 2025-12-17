-- Create RPC function to get HSSE contact for a location/branch
CREATE OR REPLACE FUNCTION get_hsse_contact_for_location(p_branch_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone_number text,
  role_name text,
  role_code text,
  avatar_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id,
    p.full_name,
    p.phone_number,
    r.name as role_name,
    r.code as role_code,
    p.avatar_url
  FROM profiles p
  JOIN user_role_assignments ura ON p.id = ura.user_id AND ura.deleted_at IS NULL
  JOIN roles r ON ura.role_id = r.id
  WHERE p.assigned_branch_id = p_branch_id
    AND r.code IN ('hsse_officer', 'hsse_expert', 'hsse_manager')
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND p.tenant_id = get_auth_tenant_id()
  ORDER BY p.id,
    CASE r.code 
      WHEN 'hsse_officer' THEN 1
      WHEN 'hsse_expert' THEN 2
      WHEN 'hsse_manager' THEN 3
    END
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;