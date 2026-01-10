-- =====================================================
-- FIX: Simplified RLS for inspection_templates Soft-Delete
-- 1. Fix function to use correct column (user_id)
-- 2. Simplify UPDATE policy (remove WITH CHECK)
-- =====================================================

-- 1. Fix the get_auth_tenant_id_bypass function to use user_id column
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id_bypass()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
$$;

-- 2. Simplify UPDATE policy - remove WITH CHECK (tenant_id is immutable)
DROP POLICY IF EXISTS "tenant_update_templates" ON public.inspection_templates;

CREATE POLICY "tenant_update_templates"
ON public.inspection_templates
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id_bypass()
);
-- No WITH CHECK clause needed since tenant_id is immutable

-- 3. Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';