-- Fix Critical Security Vulnerabilities

-- 1. RESTRICT TENANT TABLE PUBLIC ACCESS
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Tenants are viewable by everyone" ON public.tenants;

-- Create restricted SELECT policy - only authenticated users can view their own tenant
CREATE POLICY "Users can view their own tenant"
ON public.tenants
FOR SELECT
USING (
  id = get_auth_tenant_id() OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. LIMIT TENANT UPDATES TO ADMINS ONLY
-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update tenants" ON public.tenants;

-- Create restricted UPDATE policy - only admins can update tenants
CREATE POLICY "Admins can update tenants"
ON public.tenants
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. ADD CROSS-TENANT DENIAL FOR PROFILES
-- Drop existing policies and recreate with tenant isolation
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;

-- Users can only view profiles within their own tenant (prevents cross-tenant access)
CREATE POLICY "Users view own profile within tenant"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  AND tenant_id = get_auth_tenant_id()
);

-- 4. STRENGTHEN VISITOR DATA ISOLATION
-- Drop existing visitor SELECT policy
DROP POLICY IF EXISTS "Users can view visitors in their tenant" ON public.visitors;

-- Create stronger isolation policy with explicit tenant check
CREATE POLICY "Users can view visitors in their tenant only"
ON public.visitors
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND get_auth_tenant_id() IS NOT NULL
);

-- Also strengthen visit_requests SELECT policy
DROP POLICY IF EXISTS "Users can view visit requests in their tenant" ON public.visit_requests;

CREATE POLICY "Users can view visit requests in their tenant only"
ON public.visit_requests
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND get_auth_tenant_id() IS NOT NULL
);

-- Strengthen security_blacklist policies
DROP POLICY IF EXISTS "Admins can view blacklist" ON public.security_blacklist;

CREATE POLICY "Admins can view blacklist in tenant"
ON public.security_blacklist
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (tenant_id = get_auth_tenant_id() OR has_role(auth.uid(), 'admin'::app_role))
);