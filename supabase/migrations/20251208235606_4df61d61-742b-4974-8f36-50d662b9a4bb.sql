-- Create RPC function to get managers for team assignment
-- This bypasses RLS to safely return managers list
CREATE OR REPLACE FUNCTION get_managers_for_team_assignment(
  p_tenant_id uuid, 
  p_exclude_user_id uuid
)
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.full_name
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON ura.role_id = r.id
  WHERE 
    p.tenant_id = p_tenant_id
    AND p.is_active = true
    AND (p.is_deleted IS NULL OR p.is_deleted = false)
    AND p.id != p_exclude_user_id
    AND r.code = 'manager'
    AND ura.tenant_id = p_tenant_id
$$;