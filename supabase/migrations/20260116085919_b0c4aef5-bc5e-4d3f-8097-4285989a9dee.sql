-- Phase 1: Create Cascade Soft Delete Functions

-- 1.1 Create soft_delete_site_cascade function
CREATE OR REPLACE FUNCTION public.soft_delete_site_cascade(p_site_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
  v_floors_deleted int;
  v_buildings_deleted int;
BEGIN
  -- Authentication check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  -- Get user tenant
  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Validate site exists and belongs to user's tenant
  SELECT id, tenant_id, deleted_at INTO v_record FROM sites WHERE id = p_site_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Site not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Site already deleted';
  END IF;

  -- CASCADE: Soft delete all floors/zones in buildings of this site
  UPDATE floors_zones 
  SET deleted_at = now() 
  WHERE building_id IN (
    SELECT id FROM buildings WHERE site_id = p_site_id AND deleted_at IS NULL
  )
  AND deleted_at IS NULL;
  GET DIAGNOSTICS v_floors_deleted = ROW_COUNT;
  
  -- CASCADE: Soft delete all buildings of this site
  UPDATE buildings 
  SET deleted_at = now() 
  WHERE site_id = p_site_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_buildings_deleted = ROW_COUNT;
  
  -- Soft delete the site itself
  UPDATE sites SET deleted_at = now() WHERE id = p_site_id;
  
  RAISE NOTICE 'Site cascade delete: % buildings, % floors/zones deleted', v_buildings_deleted, v_floors_deleted;
  
  RETURN p_site_id;
END;
$$;

-- 1.2 Create soft_delete_building_cascade function
CREATE OR REPLACE FUNCTION public.soft_delete_building_cascade(p_building_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
  v_floors_deleted int;
BEGIN
  -- Authentication check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  -- Get user tenant
  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Validate building exists and belongs to user's tenant
  SELECT id, tenant_id, deleted_at INTO v_record FROM buildings WHERE id = p_building_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Building not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Building already deleted';
  END IF;

  -- CASCADE: Soft delete all floors/zones in this building
  UPDATE floors_zones 
  SET deleted_at = now() 
  WHERE building_id = p_building_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_floors_deleted = ROW_COUNT;
  
  -- Soft delete the building itself
  UPDATE buildings SET deleted_at = now() WHERE id = p_building_id;
  
  RAISE NOTICE 'Building cascade delete: % floors/zones deleted', v_floors_deleted;
  
  RETURN p_building_id;
END;
$$;

-- 1.3 Create soft_delete_branch_cascade function
CREATE OR REPLACE FUNCTION public.soft_delete_branch_cascade(p_branch_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
  v_sites_deleted int;
  v_buildings_deleted int;
  v_floors_deleted int;
  v_divisions_deleted int;
  v_departments_deleted int;
  v_sections_deleted int;
BEGIN
  -- Authentication check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  -- Get user tenant
  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Validate branch exists
  SELECT id, tenant_id, deleted_at INTO v_record FROM branches WHERE id = p_branch_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Branch already deleted';
  END IF;

  -- CASCADE Level 3: Soft delete all floors/zones
  UPDATE floors_zones 
  SET deleted_at = now() 
  WHERE building_id IN (
    SELECT b.id FROM buildings b
    JOIN sites s ON b.site_id = s.id
    WHERE s.branch_id = p_branch_id AND b.deleted_at IS NULL
  )
  AND deleted_at IS NULL;
  GET DIAGNOSTICS v_floors_deleted = ROW_COUNT;
  
  -- CASCADE Level 2: Soft delete all buildings
  UPDATE buildings 
  SET deleted_at = now() 
  WHERE site_id IN (
    SELECT id FROM sites WHERE branch_id = p_branch_id AND deleted_at IS NULL
  )
  AND deleted_at IS NULL;
  GET DIAGNOSTICS v_buildings_deleted = ROW_COUNT;
  
  -- CASCADE Level 1: Soft delete all sites
  UPDATE sites 
  SET deleted_at = now() 
  WHERE branch_id = p_branch_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_sites_deleted = ROW_COUNT;
  
  -- Soft delete divisions linked to branch
  UPDATE divisions SET deleted_at = now() WHERE branch_id = p_branch_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_divisions_deleted = ROW_COUNT;
  
  -- Soft delete departments linked to branch
  UPDATE departments SET deleted_at = now() WHERE branch_id = p_branch_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_departments_deleted = ROW_COUNT;
  
  -- Soft delete sections linked to branch
  UPDATE sections SET deleted_at = now() WHERE branch_id = p_branch_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_sections_deleted = ROW_COUNT;
  
  -- Soft delete the branch itself
  UPDATE branches SET deleted_at = now() WHERE id = p_branch_id;
  
  RAISE NOTICE 'Branch cascade delete: % sites, % buildings, % floors, % divisions, % departments, % sections', 
    v_sites_deleted, v_buildings_deleted, v_floors_deleted, v_divisions_deleted, v_departments_deleted, v_sections_deleted;
  
  RETURN p_branch_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.soft_delete_site_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_building_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_branch_cascade(uuid) TO authenticated;