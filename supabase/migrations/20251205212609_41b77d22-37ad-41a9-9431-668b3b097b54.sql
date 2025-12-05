-- Create function to get user counts for multiple tenants (admin only)
CREATE OR REPLACE FUNCTION public.get_tenant_user_counts(p_tenant_ids uuid[])
RETURNS TABLE(tenant_id uuid, user_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.tenant_id,
    COUNT(*)::bigint as user_count
  FROM profiles p
  WHERE p.tenant_id = ANY(p_tenant_ids)
    AND (p.is_deleted IS NULL OR p.is_deleted = false)
  GROUP BY p.tenant_id;
END;
$$;