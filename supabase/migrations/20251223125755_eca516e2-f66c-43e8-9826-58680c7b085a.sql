-- Create function to get MFA stats with proper access to auth.mfa_factors
CREATE OR REPLACE FUNCTION public.get_mfa_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(total_users BIGINT, mfa_enabled_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id)::BIGINT as total_users,
    COUNT(DISTINCT mf.user_id)::BIGINT as mfa_enabled_count
  FROM profiles p
  LEFT JOIN auth.mfa_factors mf ON p.id = mf.user_id AND mf.status = 'verified'
  WHERE p.is_active = true 
    AND p.is_deleted = false
    AND (p_tenant_id IS NULL OR p.tenant_id = p_tenant_id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_mfa_stats(UUID) TO authenticated;