-- Update lookup_invitation to include metadata
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
  AND deleted_at IS NULL
  LIMIT 1;

  -- Return null if not found (security: don't reveal why it failed)
  IF invite_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch ALL tenant details for full branding
  SELECT * INTO tenant_data
  FROM public.tenants
  WHERE id = invite_data.tenant_id;

  -- Return comprehensive branding data including metadata
  RETURN jsonb_build_object(
    'email', invite_data.email,
    'tenant_id', invite_data.tenant_id,
    'role', 'user',
    'metadata', COALESCE(invite_data.metadata, '{}'::jsonb),
    'tenant_name', COALESCE(tenant_data.name, 'Dhuud Platform'),
    -- Light mode
    'brand_color', COALESCE(tenant_data.brand_color, '221.2 83.2% 53.3%'),
    'secondary_color', tenant_data.secondary_color,
    'logo_light_url', tenant_data.logo_light_url,
    'sidebar_icon_light_url', tenant_data.sidebar_icon_light_url,
    'app_icon_light_url', tenant_data.app_icon_light_url,
    -- Dark mode
    'brand_color_dark', COALESCE(tenant_data.brand_color_dark, '217 91% 60%'),
    'secondary_color_dark', tenant_data.secondary_color_dark,
    'logo_dark_url', tenant_data.logo_dark_url,
    'sidebar_icon_dark_url', tenant_data.sidebar_icon_dark_url,
    'app_icon_dark_url', tenant_data.app_icon_dark_url,
    -- Background & favicon
    'background_color', tenant_data.background_color,
    'background_theme', tenant_data.background_theme,
    'background_image_url', tenant_data.background_image_url,
    'favicon_url', tenant_data.favicon_url
  );
END;
$function$;