-- Fix inspection_templates RLS policy being too restrictive
--
-- Issue: Users cannot create inspection templates due to overly restrictive RLS policy
-- Error: "new row violates row-level security policy for table inspection_templates"
--
-- Root cause: INSERT policy requires has_asset_management_access() which checks for
-- admin, HSSE, or security roles. Regular users with inspection permissions can't create templates.
--
-- Solution: Make the INSERT policy more permissive - allow any authenticated user in the tenant
-- to create templates. Organizations can add additional application-level restrictions if needed.

-- Drop the overly restrictive INSERT policy
DROP POLICY IF EXISTS "HSSE users can create templates" ON public.inspection_templates;

-- Create a more permissive INSERT policy
CREATE POLICY "Authenticated users can create templates in their tenant"
  ON public.inspection_templates FOR INSERT
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

-- Similarly, fix the template_items INSERT policy to match
DROP POLICY IF EXISTS "HSSE users can create template items" ON public.inspection_template_items;

CREATE POLICY "Authenticated users can create template items in their tenant"
  ON public.inspection_template_items FOR INSERT
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

-- Also fix the UPDATE policies to remove deleted_at IS NULL check from USING clause
-- This was blocking updates that set deleted_at (soft deletes)

DROP POLICY IF EXISTS "HSSE users can update templates" ON public.inspection_templates;

CREATE POLICY "Authenticated users can update templates"
  ON public.inspection_templates FOR UPDATE
  USING (
    tenant_id = get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "HSSE users can update template items" ON public.inspection_template_items;

CREATE POLICY "Authenticated users can update template items"
  ON public.inspection_template_items FOR UPDATE
  USING (
    tenant_id = get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

-- Fix asset_inspections policies similarly
DROP POLICY IF EXISTS "HSSE users can create inspections" ON public.asset_inspections;

CREATE POLICY "Authenticated users can create inspections in their tenant"
  ON public.asset_inspections FOR INSERT
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "HSSE users can update inspections" ON public.asset_inspections;

CREATE POLICY "Authenticated users can update inspections"
  ON public.asset_inspections FOR UPDATE
  USING (
    tenant_id = get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

-- Fix inspection_responses policies
DROP POLICY IF EXISTS "HSSE users can create responses" ON public.inspection_responses;

CREATE POLICY "Authenticated users can create responses in their tenant"
  ON public.inspection_responses FOR INSERT
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "HSSE users can update responses" ON public.inspection_responses;

CREATE POLICY "Authenticated users can update responses"
  ON public.inspection_responses FOR UPDATE
  USING (
    tenant_id = get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

-- Add comments explaining the rationale
COMMENT ON POLICY "Authenticated users can create templates in their tenant" ON public.inspection_templates IS
  'Allow any authenticated tenant user to create templates. Application-level permissions can add finer-grained control if needed.';

COMMENT ON POLICY "Authenticated users can update templates" ON public.inspection_templates IS
  'Allow authenticated users to update templates. Removed deleted_at check to allow soft-delete operations.';

COMMENT ON POLICY "Authenticated users can create inspections in their tenant" ON public.asset_inspections IS
  'Allow any authenticated tenant user to create inspections. Application-level permissions can add finer-grained control if needed.';

COMMENT ON POLICY "Authenticated users can create responses in their tenant" ON public.inspection_responses IS
  'Allow any authenticated tenant user to create inspection responses. Application-level permissions can add finer-grained control if needed.';
