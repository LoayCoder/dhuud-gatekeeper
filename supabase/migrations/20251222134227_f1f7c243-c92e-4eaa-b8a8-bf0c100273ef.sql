-- ====================================================================
-- CRITICAL: Multi-Tenant Data Isolation Fix
-- This migration fixes RLS policies that allowed cross-tenant data access
-- ====================================================================

-- 1. Create helper function for tenant-aware admin check
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.user_role_assignments ura ON ura.user_id = p.id
    JOIN public.roles r ON r.id = ura.role_id
    WHERE p.id = _user_id
      AND r.code = 'admin'
      AND r.is_active = true
  );
$$;

-- ====================================================================
-- 2. Fix BRANCHES table RLS policies
-- ====================================================================
DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;
DROP POLICY IF EXISTS "Users can view own tenant branches" ON public.branches;
DROP POLICY IF EXISTS "Tenant admins can manage their branches" ON public.branches;
DROP POLICY IF EXISTS "Users can view their tenant branches" ON public.branches;

-- Allow users to view branches in their tenant
CREATE POLICY "Users can view their tenant branches"
ON public.branches
FOR SELECT
TO authenticated
USING (tenant_id = get_auth_tenant_id());

-- Allow tenant admins to manage branches in their tenant only
CREATE POLICY "Tenant admins can manage their branches"
ON public.branches
FOR ALL
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()))
WITH CHECK (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()));

-- ====================================================================
-- 3. Fix DIVISIONS table RLS policies
-- ====================================================================
DROP POLICY IF EXISTS "Admins can manage divisions" ON public.divisions;
DROP POLICY IF EXISTS "Users can view own tenant divisions" ON public.divisions;
DROP POLICY IF EXISTS "Tenant admins can manage their divisions" ON public.divisions;
DROP POLICY IF EXISTS "Users can view their tenant divisions" ON public.divisions;

CREATE POLICY "Users can view their tenant divisions"
ON public.divisions
FOR SELECT
TO authenticated
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant admins can manage their divisions"
ON public.divisions
FOR ALL
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()))
WITH CHECK (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()));

-- ====================================================================
-- 4. Fix DEPARTMENTS table RLS policies
-- ====================================================================
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Users can view own tenant departments" ON public.departments;
DROP POLICY IF EXISTS "Tenant admins can manage their departments" ON public.departments;
DROP POLICY IF EXISTS "Users can view their tenant departments" ON public.departments;

CREATE POLICY "Users can view their tenant departments"
ON public.departments
FOR SELECT
TO authenticated
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant admins can manage their departments"
ON public.departments
FOR ALL
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()))
WITH CHECK (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()));

-- ====================================================================
-- 5. Fix SECTIONS table RLS policies
-- ====================================================================
DROP POLICY IF EXISTS "Admins can manage sections" ON public.sections;
DROP POLICY IF EXISTS "Users can view own tenant sections" ON public.sections;
DROP POLICY IF EXISTS "Tenant admins can manage their sections" ON public.sections;
DROP POLICY IF EXISTS "Users can view their tenant sections" ON public.sections;

CREATE POLICY "Users can view their tenant sections"
ON public.sections
FOR SELECT
TO authenticated
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant admins can manage their sections"
ON public.sections
FOR ALL
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()))
WITH CHECK (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()));

-- ====================================================================
-- 6. Fix SITES table RLS policies
-- ====================================================================
DROP POLICY IF EXISTS "Admins can manage sites" ON public.sites;
DROP POLICY IF EXISTS "Users can view own tenant sites" ON public.sites;
DROP POLICY IF EXISTS "Tenant admins can manage their sites" ON public.sites;
DROP POLICY IF EXISTS "Users can view their tenant sites" ON public.sites;

CREATE POLICY "Users can view their tenant sites"
ON public.sites
FOR SELECT
TO authenticated
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant admins can manage their sites"
ON public.sites
FOR ALL
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()))
WITH CHECK (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()));