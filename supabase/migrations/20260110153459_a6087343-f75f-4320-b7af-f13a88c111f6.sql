-- CRITICAL FIX: Add explicit WITH CHECK clause to UPDATE policies
-- This allows soft-delete (setting deleted_at) once USING clause passes

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "templates_tenant_update_v2" ON public.inspection_templates;
DROP POLICY IF EXISTS "template_items_update_v2" ON public.inspection_template_items;

-- Recreate UPDATE policy with explicit WITH CHECK (true)
CREATE POLICY "templates_tenant_update_v3"
ON public.inspection_templates FOR UPDATE TO authenticated
USING (tenant_id = get_auth_tenant_id_bypass())
WITH CHECK (true);  -- Allow any column changes once USING passes

CREATE POLICY "template_items_update_v3"
ON public.inspection_template_items FOR UPDATE TO authenticated
USING (tenant_id = get_auth_tenant_id_bypass())
WITH CHECK (true);  -- Allow any column changes once USING passes

-- Force schema reload
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');