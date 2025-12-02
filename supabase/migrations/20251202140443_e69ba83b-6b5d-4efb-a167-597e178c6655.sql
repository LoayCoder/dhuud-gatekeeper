-- Update lookup_invitation to also return tenant branding info
CREATE OR REPLACE FUNCTION public.lookup_invitation(lookup_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invite_data RECORD;
  tenant_data RECORD;
BEGIN
  -- Find the invitation
  SELECT * INTO invite_data
  FROM public.invitations
  WHERE code = lookup_code
  AND used = false
  AND expires_at > NOW()
  LIMIT 1;

  -- Return null if not found (security: don't reveal why it failed)
  IF invite_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch tenant details for branding
  SELECT * INTO tenant_data
  FROM public.tenants
  WHERE id = invite_data.tenant_id;

  -- Return combined data including tenant branding
  RETURN jsonb_build_object(
    'email', invite_data.email,
    'tenant_id', invite_data.tenant_id,
    'role', 'user',
    'tenant_name', COALESCE(tenant_data.name, 'Dhuud Platform'),
    'brand_color', COALESCE(tenant_data.brand_color, '221.2 83.2% 53.3%'),
    'logo_url', tenant_data.logo_url
  );
END;
$function$;

-- Ensure both anon and authenticated can execute
GRANT EXECUTE ON FUNCTION public.lookup_invitation TO anon, authenticated;