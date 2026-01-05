-- Prevent cross-tenant asset references in incident_asset_links
CREATE OR REPLACE FUNCTION public.validate_same_tenant_asset_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_tenant_id UUID;
  v_asset_tenant_id UUID;
BEGIN
  -- Get tenant_id from the incident
  SELECT tenant_id INTO v_incident_tenant_id
  FROM incidents
  WHERE id = NEW.incident_id;
  
  -- Get tenant_id from the asset
  SELECT tenant_id INTO v_asset_tenant_id
  FROM hsse_assets
  WHERE id = NEW.asset_id;
  
  -- Validate both belong to the same tenant
  IF v_incident_tenant_id IS DISTINCT FROM v_asset_tenant_id THEN
    RAISE EXCEPTION 'Cross-tenant asset linking is not allowed. Incident tenant: %, Asset tenant: %', 
      v_incident_tenant_id, v_asset_tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists, then create new one
DROP TRIGGER IF EXISTS enforce_same_tenant_asset_link ON incident_asset_links;

CREATE TRIGGER enforce_same_tenant_asset_link
BEFORE INSERT OR UPDATE ON incident_asset_links
FOR EACH ROW EXECUTE FUNCTION public.validate_same_tenant_asset_link();

-- Add comment for documentation
COMMENT ON FUNCTION public.validate_same_tenant_asset_link() IS 
'Security trigger function to prevent cross-tenant asset linking in incidents';