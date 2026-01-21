-- ============================================================
-- Soft Delete & Restore Functions for 7-Day Trash System
-- ============================================================

-- 1. Create soft_delete_hsse_asset function
CREATE OR REPLACE FUNCTION public.soft_delete_hsse_asset(p_asset_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  -- Authentication check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  -- Get user's tenant
  SELECT tenant_id INTO v_user_tenant_id 
  FROM profiles WHERE user_id = v_user_id;
  
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Verify asset exists, belongs to user's tenant, and is not already deleted
  IF NOT EXISTS (
    SELECT 1 FROM hsse_assets 
    WHERE id = p_asset_id 
    AND tenant_id = v_user_tenant_id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Asset not found or already deleted';
  END IF;

  -- Soft delete: set deleted_at timestamp
  UPDATE hsse_assets 
  SET deleted_at = NOW(),
      updated_at = NOW(),
      updated_by = v_user_id
  WHERE id = p_asset_id
    AND tenant_id = v_user_tenant_id
    AND deleted_at IS NULL;
  
  RETURN p_asset_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_hsse_asset(uuid) TO authenticated;

-- 2. Create restore_hsse_asset function
CREATE OR REPLACE FUNCTION public.restore_hsse_asset(p_asset_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
  v_asset_code text;
BEGIN
  -- Authentication check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  -- Get user's tenant
  SELECT tenant_id INTO v_user_tenant_id 
  FROM profiles WHERE user_id = v_user_id;
  
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Get asset code and verify it's in trash and belongs to user's tenant
  SELECT asset_code INTO v_asset_code
  FROM hsse_assets 
  WHERE id = p_asset_id 
  AND tenant_id = v_user_tenant_id
  AND deleted_at IS NOT NULL;
  
  IF v_asset_code IS NULL THEN
    RAISE EXCEPTION 'Asset not found in trash';
  END IF;
  
  -- Check if restoring would conflict with an active asset with the same code
  IF EXISTS (
    SELECT 1 FROM hsse_assets
    WHERE tenant_id = v_user_tenant_id
    AND asset_code = v_asset_code
    AND id != p_asset_id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot restore: an active asset with code % already exists', v_asset_code;
  END IF;

  -- Restore the asset (clear deleted_at)
  UPDATE hsse_assets 
  SET deleted_at = NULL,
      updated_at = NOW(),
      updated_by = v_user_id
  WHERE id = p_asset_id
    AND tenant_id = v_user_tenant_id
    AND deleted_at IS NOT NULL;
  
  RETURN p_asset_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_hsse_asset(uuid) TO authenticated;

-- 3. Create function to get trash items with expiry info
CREATE OR REPLACE FUNCTION public.get_trash_assets()
RETURNS TABLE (
  id uuid,
  asset_code text,
  name text,
  deleted_at timestamptz,
  expires_at timestamptz,
  days_remaining integer,
  category_name text,
  category_name_ar text,
  category_icon text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  -- Authentication check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  -- Get user's tenant
  SELECT p.tenant_id INTO v_user_tenant_id 
  FROM profiles p WHERE p.user_id = v_user_id;
  
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  RETURN QUERY
  SELECT 
    a.id,
    a.asset_code,
    a.name,
    a.deleted_at,
    (a.deleted_at + INTERVAL '7 days')::timestamptz AS expires_at,
    GREATEST(0, EXTRACT(DAY FROM (a.deleted_at + INTERVAL '7 days') - NOW())::integer) AS days_remaining,
    c.name AS category_name,
    c.name_ar AS category_name_ar,
    c.icon AS category_icon
  FROM hsse_assets a
  LEFT JOIN asset_categories c ON a.category_id = c.id
  WHERE a.tenant_id = v_user_tenant_id
    AND a.deleted_at IS NOT NULL
  ORDER BY a.deleted_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trash_assets() TO authenticated;

-- 4. Create bulk soft delete function
CREATE OR REPLACE FUNCTION public.bulk_soft_delete_assets(p_asset_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
  v_deleted_count integer;
BEGIN
  -- Authentication check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  -- Get user's tenant
  SELECT tenant_id INTO v_user_tenant_id 
  FROM profiles WHERE user_id = v_user_id;
  
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Soft delete all matching assets
  UPDATE hsse_assets 
  SET deleted_at = NOW(),
      updated_at = NOW(),
      updated_by = v_user_id
  WHERE id = ANY(p_asset_ids)
    AND tenant_id = v_user_tenant_id
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_soft_delete_assets(uuid[]) TO authenticated;

-- 5. Create bulk restore function
CREATE OR REPLACE FUNCTION public.bulk_restore_assets(p_asset_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
  v_restored_count integer;
BEGIN
  -- Authentication check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  -- Get user's tenant
  SELECT tenant_id INTO v_user_tenant_id 
  FROM profiles WHERE user_id = v_user_id;
  
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Restore all matching assets (only those in trash)
  UPDATE hsse_assets 
  SET deleted_at = NULL,
      updated_at = NOW(),
      updated_by = v_user_id
  WHERE id = ANY(p_asset_ids)
    AND tenant_id = v_user_tenant_id
    AND deleted_at IS NOT NULL;
  
  GET DIAGNOSTICS v_restored_count = ROW_COUNT;
  
  RETURN v_restored_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_restore_assets(uuid[]) TO authenticated;

-- 6. Create function to permanently delete expired trash items (7+ days)
CREATE OR REPLACE FUNCTION public.cleanup_expired_trash_assets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_asset_id uuid;
  v_deleted_count integer := 0;
BEGIN
  -- Find all assets that have been in trash for 7+ days
  FOR v_asset_id IN 
    SELECT id FROM hsse_assets 
    WHERE deleted_at IS NOT NULL 
      AND deleted_at < NOW() - INTERVAL '7 days'
  LOOP
    -- Use the existing hard_delete function for each asset
    PERFORM hard_delete_hsse_asset(v_asset_id);
    v_deleted_count := v_deleted_count + 1;
  END LOOP;
  
  RETURN v_deleted_count;
END;
$$;

-- Grant to service role for cron jobs
GRANT EXECUTE ON FUNCTION public.cleanup_expired_trash_assets() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_trash_assets() TO authenticated;