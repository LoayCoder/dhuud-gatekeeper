-- Create hard delete function for HSSE assets
CREATE OR REPLACE FUNCTION public.hard_delete_hsse_asset(p_asset_id uuid)
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
  -- Authentication check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  -- Get user's tenant
  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Verify asset exists and belongs to user's tenant
  SELECT id, tenant_id INTO v_record FROM hsse_assets WHERE id = p_asset_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;

  -- HARD DELETE all child records first (order matters for FK constraints)
  DELETE FROM asset_inspection_part_results WHERE inspection_id IN 
    (SELECT id FROM asset_inspections WHERE asset_id = p_asset_id);
  DELETE FROM asset_maintenance_schedules WHERE asset_id = p_asset_id;
  DELETE FROM asset_cost_transactions WHERE asset_id = p_asset_id;
  DELETE FROM asset_inspections WHERE asset_id = p_asset_id;
  DELETE FROM asset_documents WHERE asset_id = p_asset_id;
  DELETE FROM asset_photos WHERE asset_id = p_asset_id;
  DELETE FROM asset_maintenance_history WHERE asset_id = p_asset_id;
  DELETE FROM asset_depreciation_schedules WHERE asset_id = p_asset_id;
  DELETE FROM asset_health_scores WHERE asset_id = p_asset_id;
  DELETE FROM asset_failure_predictions WHERE asset_id = p_asset_id;
  DELETE FROM asset_audit_logs WHERE asset_id = p_asset_id;
  DELETE FROM incident_asset_links WHERE asset_id = p_asset_id;
  
  -- HARD DELETE the asset itself
  DELETE FROM hsse_assets WHERE id = p_asset_id;
  
  RETURN p_asset_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.hard_delete_hsse_asset(uuid) TO authenticated;

-- Clean up existing soft-deleted records
DELETE FROM asset_inspection_part_results WHERE inspection_id IN 
  (SELECT id FROM asset_inspections WHERE asset_id IN 
    (SELECT id FROM hsse_assets WHERE deleted_at IS NOT NULL));
DELETE FROM asset_maintenance_schedules WHERE asset_id IN 
  (SELECT id FROM hsse_assets WHERE deleted_at IS NOT NULL);
DELETE FROM asset_cost_transactions WHERE asset_id IN 
  (SELECT id FROM hsse_assets WHERE deleted_at IS NOT NULL);
DELETE FROM asset_inspections WHERE asset_id IN 
  (SELECT id FROM hsse_assets WHERE deleted_at IS NOT NULL);
DELETE FROM asset_documents WHERE asset_id IN 
  (SELECT id FROM hsse_assets WHERE deleted_at IS NOT NULL);
DELETE FROM asset_photos WHERE asset_id IN 
  (SELECT id FROM hsse_assets WHERE deleted_at IS NOT NULL);
DELETE FROM asset_maintenance_history WHERE asset_id IN 
  (SELECT id FROM hsse_assets WHERE deleted_at IS NOT NULL);
DELETE FROM asset_depreciation_schedules WHERE asset_id IN 
  (SELECT id FROM hsse_assets WHERE deleted_at IS NOT NULL);
DELETE FROM asset_health_scores WHERE asset_id IN 
  (SELECT id FROM hsse_assets WHERE deleted_at IS NOT NULL);
DELETE FROM asset_failure_predictions WHERE asset_id IN 
  (SELECT id FROM hsse_assets WHERE deleted_at IS NOT NULL);
DELETE FROM asset_audit_logs WHERE asset_id IN 
  (SELECT id FROM hsse_assets WHERE deleted_at IS NOT NULL);
DELETE FROM incident_asset_links WHERE asset_id IN 
  (SELECT id FROM hsse_assets WHERE deleted_at IS NOT NULL);

-- Finally, permanently remove soft-deleted assets
DELETE FROM hsse_assets WHERE deleted_at IS NOT NULL;