-- Fix get_auth_tenant_id() function - add missing SET search_path
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  tenant UUID;
BEGIN
  SELECT tenant_id INTO tenant
  FROM public.profiles
  WHERE user_id = auth.uid();
  RETURN tenant;
END;
$$;

-- Drop and recreate update policy with simplified WITH CHECK
DROP POLICY IF EXISTS security_zones_update_policy ON public.security_zones;

CREATE POLICY security_zones_update_policy
  ON public.security_zones
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_auth_tenant_id() 
    AND (is_admin(auth.uid()) OR has_security_access(auth.uid()))
  )
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
  );

-- Add explicit DELETE policy for future-proofing
DROP POLICY IF EXISTS security_zones_delete_policy ON public.security_zones;

CREATE POLICY security_zones_delete_policy
  ON public.security_zones
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_auth_tenant_id() 
    AND (is_admin(auth.uid()) OR has_security_access(auth.uid()))
  );