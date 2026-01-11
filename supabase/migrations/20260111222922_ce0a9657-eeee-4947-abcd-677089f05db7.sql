-- Create SECURITY DEFINER function to get supervisors bypassing RLS
CREATE OR REPLACE FUNCTION get_tenant_supervisors()
RETURNS TABLE (
  id uuid,
  full_name text,
  role_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Get caller's tenant_id using existing bypass function
  v_tenant_id := get_profile_tenant_id_bypass(auth.uid());
  
  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.full_name::text,
    r.code::text as role_code
  FROM user_role_assignments ura
  JOIN roles r ON ura.role_id = r.id
  JOIN profiles p ON ura.user_id = p.id
  WHERE ura.tenant_id = v_tenant_id
    AND r.code IN ('security_supervisor', 'security_manager', 'security_shift_leader')
    AND p.deleted_at IS NULL
    AND (p.is_active = true OR p.is_active IS NULL);
END;
$$;