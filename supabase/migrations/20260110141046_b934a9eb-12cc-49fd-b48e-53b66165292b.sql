-- =====================================================
-- FIX: RLS Soft-Delete for inspection_template_items
-- Same pattern as inspection_templates fix
-- =====================================================

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can view template items in their tenant" ON public.inspection_template_items;
DROP POLICY IF EXISTS "HSSE users can create template items" ON public.inspection_template_items;
DROP POLICY IF EXISTS "HSSE users can update template items" ON public.inspection_template_items;
DROP POLICY IF EXISTS "Admins can delete template items" ON public.inspection_template_items;

-- 2. SELECT policy - Only show non-deleted items in tenant
CREATE POLICY "template_items_select"
ON public.inspection_template_items
FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant_id_bypass()
  AND deleted_at IS NULL
);

-- 3. INSERT policy - Users can create items in their tenant
CREATE POLICY "template_items_insert"
ON public.inspection_template_items
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_auth_tenant_id_bypass()
);

-- 4. UPDATE policy - THE KEY FIX
-- USING: Must match tenant (NO deleted_at check - allows soft-delete)
-- No WITH CHECK needed since tenant_id is immutable
CREATE POLICY "template_items_update"
ON public.inspection_template_items
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id_bypass()
);

-- 5. DELETE policy (hard delete)
CREATE POLICY "template_items_delete"
ON public.inspection_template_items
FOR DELETE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id_bypass()
);

-- 6. Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';