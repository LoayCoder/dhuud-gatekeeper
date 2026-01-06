-- Fix get_auth_tenant_id() to use correct column name
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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