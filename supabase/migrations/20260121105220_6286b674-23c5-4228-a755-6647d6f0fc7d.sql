-- Fix: Update soft_delete_hsse_asset to use correct table name (incident_asset_links instead of incident_assets)
CREATE OR REPLACE FUNCTION public.soft_delete_hsse_asset(p_asset_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM hsse_assets WHERE id = p_asset_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Asset already deleted';
  END IF;

  -- Soft-delete child records
  UPDATE asset_maintenance_schedules SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_cost_transactions SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_inspections SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_documents SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_photos SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_maintenance_history SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_depreciation_schedules SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_health_scores SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_failure_predictions SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  -- FIX: Changed from incident_assets to incident_asset_links
  UPDATE incident_asset_links SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE hsse_assets SET deleted_at = now() WHERE id = p_asset_id;
  
  RETURN p_asset_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_hsse_asset(uuid) TO authenticated;