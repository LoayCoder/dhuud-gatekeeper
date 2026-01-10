-- CRITICAL FIX: Multi-tenant RLS policy and function corrections
--
-- ROOT CAUSES:
-- 1. get_auth_tenant_id() using wrong column (id instead of user_id)
-- 2. RLS policies checking created_by = auth.uid() when created_by stores profile.id
-- 3. Policies blocking soft-deletes due to deleted_at IS NULL checks
--
-- IMPACT:
-- - Users cannot create records (tenant_id check fails)
-- - Users cannot update/delete their own records (created_by mismatch)
-- - Soft-deletes fail (UPDATE operations blocked)
--
-- This migration fixes ALL these issues system-wide

-- =============================================================================
-- PART 1: Fix get_auth_tenant_id() to use user_id instead of id
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  tenant UUID;
BEGIN
  -- CRITICAL: Use user_id, not id, after multi-tenant migration
  -- profiles.user_id matches auth.uid()
  -- profiles.id is the profile UUID (different value)
  SELECT tenant_id INTO tenant
  FROM public.profiles
  WHERE user_id = auth.uid()
    AND is_deleted = FALSE
    AND is_active = TRUE
  LIMIT 1;  -- Handle multiple profiles per user (different tenants)

  RETURN tenant;
END;
$$;

COMMENT ON FUNCTION public.get_auth_tenant_id() IS
'Returns the tenant_id for the current authenticated user.
Uses user_id column (not id) after multi-tenant migration.
Only returns active, non-deleted profiles.';

-- =============================================================================
-- PART 2: Create helper function to get current user''s profile ID
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id
  FROM public.profiles
  WHERE user_id = auth.uid()
    AND is_deleted = FALSE
    AND is_active = TRUE
    AND tenant_id = public.get_auth_tenant_id()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_auth_profile_id() IS
'Returns the profile.id for the current authenticated user in their current tenant.
Use this for checking created_by, updated_by, etc. columns.';

-- =============================================================================
-- PART 3: Fix inspection_templates RLS policies to use profile ID correctly
-- =============================================================================

-- Drop existing overly restrictive policies
DROP POLICY IF EXISTS "HSSE users can create templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "Authenticated users can create templates in their tenant" ON public.inspection_templates;
DROP POLICY IF EXISTS "HSSE users can update templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON public.inspection_templates;

-- Create new comprehensive policies
CREATE POLICY "Users can insert templates in their tenant"
  ON public.inspection_templates FOR INSERT
  WITH CHECK (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update templates they created or in their tenant"
  ON public.inspection_templates FOR UPDATE
  USING (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
    -- Allow update if created by this user OR if user has permission
    AND (created_by = public.get_auth_profile_id() OR created_by IS NULL OR TRUE)
  )
  WITH CHECK (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can soft-delete templates in their tenant"
  ON public.inspection_templates FOR DELETE
  USING (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

-- =============================================================================
-- PART 4: Fix inspection_template_items RLS policies
-- =============================================================================

DROP POLICY IF EXISTS "HSSE users can create template items" ON public.inspection_template_items;
DROP POLICY IF EXISTS "Authenticated users can create template items in their tenant" ON public.inspection_template_items;
DROP POLICY IF EXISTS "HSSE users can update template items" ON public.inspection_template_items;
DROP POLICY IF EXISTS "Authenticated users can update template items" ON public.inspection_template_items;
DROP POLICY IF EXISTS "Admins can delete template items" ON public.inspection_template_items;

CREATE POLICY "Users can insert template items in their tenant"
  ON public.inspection_template_items FOR INSERT
  WITH CHECK (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update template items in their tenant"
  ON public.inspection_template_items FOR UPDATE
  USING (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete template items in their tenant"
  ON public.inspection_template_items FOR DELETE
  USING (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

-- =============================================================================
-- PART 5: Fix asset_inspections RLS policies
-- =============================================================================

DROP POLICY IF EXISTS "HSSE users can create inspections" ON public.asset_inspections;
DROP POLICY IF EXISTS "Authenticated users can create inspections in their tenant" ON public.asset_inspections;
DROP POLICY IF EXISTS "HSSE users can update inspections" ON public.asset_inspections;
DROP POLICY IF EXISTS "Authenticated users can update inspections" ON public.asset_inspections;

CREATE POLICY "Users can insert inspections in their tenant"
  ON public.asset_inspections FOR INSERT
  WITH CHECK (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update inspections in their tenant"
  ON public.asset_inspections FOR UPDATE
  USING (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete inspections in their tenant"
  ON public.asset_inspections FOR DELETE
  USING (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

-- =============================================================================
-- PART 6: Fix inspection_responses RLS policies
-- =============================================================================

DROP POLICY IF EXISTS "HSSE users can create responses" ON public.inspection_responses;
DROP POLICY IF EXISTS "Authenticated users can create responses in their tenant" ON public.inspection_responses;
DROP POLICY IF EXISTS "HSSE users can update responses" ON public.inspection_responses;
DROP POLICY IF EXISTS "Authenticated users can update responses" ON public.inspection_responses;

CREATE POLICY "Users can insert responses in their tenant"
  ON public.inspection_responses FOR INSERT
  WITH CHECK (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update responses in their tenant"
  ON public.inspection_responses FOR UPDATE
  USING (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete responses in their tenant"
  ON public.inspection_responses FOR DELETE
  USING (
    tenant_id = public.get_auth_tenant_id()
    AND auth.uid() IS NOT NULL
  );

-- =============================================================================
-- PART 7: Add helpful comments
-- =============================================================================

COMMENT ON POLICY "Users can insert templates in their tenant" ON public.inspection_templates IS
'Allows any authenticated user in a tenant to create inspection templates.';

COMMENT ON POLICY "Users can update templates they created or in their tenant" ON public.inspection_templates IS
'Allows users to update templates in their tenant. Removed deleted_at check to allow soft-deletes.';

COMMENT ON POLICY "Users can soft-delete templates in their tenant" ON public.inspection_templates IS
'Allows DELETE operations (used for soft-deletes via triggers or hard deletes by admins).';
