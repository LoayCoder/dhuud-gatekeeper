-- PERMANENT FIX: Template Deletion RLS Issue
-- Part 1: Change function volatility to prevent caching issues

CREATE OR REPLACE FUNCTION public.get_auth_tenant_id_bypass()
RETURNS uuid
LANGUAGE sql
VOLATILE  -- Changed from STABLE to prevent incorrect caching during RLS evaluation
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
$$;

-- Part 2: Drop ALL existing policies on inspection_templates
DROP POLICY IF EXISTS "tenant_select_templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "tenant_insert_templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "tenant_update_templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "tenant_delete_templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "templates_tenant_select" ON public.inspection_templates;
DROP POLICY IF EXISTS "templates_tenant_insert" ON public.inspection_templates;
DROP POLICY IF EXISTS "templates_tenant_update" ON public.inspection_templates;
DROP POLICY IF EXISTS "templates_tenant_delete" ON public.inspection_templates;

-- Recreate ALL policies with _v2 suffix to force cache invalidation
CREATE POLICY "templates_tenant_select_v2"
ON public.inspection_templates FOR SELECT TO authenticated
USING (tenant_id = get_auth_tenant_id_bypass() AND deleted_at IS NULL);

CREATE POLICY "templates_tenant_insert_v2"
ON public.inspection_templates FOR INSERT TO authenticated
WITH CHECK (tenant_id = get_auth_tenant_id_bypass());

-- CRITICAL: UPDATE policy has NO deleted_at check - allows soft-delete
CREATE POLICY "templates_tenant_update_v2"
ON public.inspection_templates FOR UPDATE TO authenticated
USING (tenant_id = get_auth_tenant_id_bypass());

CREATE POLICY "templates_tenant_delete_v2"
ON public.inspection_templates FOR DELETE TO authenticated
USING (tenant_id = get_auth_tenant_id_bypass() AND has_role(auth.uid(), 'admin'::app_role));

-- Part 3: Drop ALL existing policies on inspection_template_items
DROP POLICY IF EXISTS "template_items_select" ON public.inspection_template_items;
DROP POLICY IF EXISTS "template_items_insert" ON public.inspection_template_items;
DROP POLICY IF EXISTS "template_items_update" ON public.inspection_template_items;
DROP POLICY IF EXISTS "template_items_delete" ON public.inspection_template_items;
DROP POLICY IF EXISTS "items_tenant_select" ON public.inspection_template_items;
DROP POLICY IF EXISTS "items_tenant_insert" ON public.inspection_template_items;
DROP POLICY IF EXISTS "items_tenant_update" ON public.inspection_template_items;
DROP POLICY IF EXISTS "items_tenant_delete" ON public.inspection_template_items;

-- Recreate ALL policies with _v2 suffix
CREATE POLICY "template_items_select_v2"
ON public.inspection_template_items FOR SELECT TO authenticated
USING (tenant_id = get_auth_tenant_id_bypass() AND deleted_at IS NULL);

CREATE POLICY "template_items_insert_v2"
ON public.inspection_template_items FOR INSERT TO authenticated
WITH CHECK (tenant_id = get_auth_tenant_id_bypass());

-- CRITICAL: UPDATE policy has NO deleted_at check - allows soft-delete
CREATE POLICY "template_items_update_v2"
ON public.inspection_template_items FOR UPDATE TO authenticated
USING (tenant_id = get_auth_tenant_id_bypass());

CREATE POLICY "template_items_delete_v2"
ON public.inspection_template_items FOR DELETE TO authenticated
USING (tenant_id = get_auth_tenant_id_bypass());

-- Part 4: Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
SELECT pg_notify('pgrst', 'reload schema');