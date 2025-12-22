-- Phase 3: Fix public exposure of configuration tables and tighten service role policies

-- =====================================================
-- 1. Fix asset_categories - restrict to authenticated users
-- =====================================================
DROP POLICY IF EXISTS "Users can view system and tenant categories" ON public.asset_categories;
DROP POLICY IF EXISTS "Admins can manage tenant categories" ON public.asset_categories;

CREATE POLICY "Authenticated users can view categories" 
ON public.asset_categories 
FOR SELECT 
TO authenticated
USING (
  ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id())) 
  AND deleted_at IS NULL
);

CREATE POLICY "Admins can manage categories" 
ON public.asset_categories 
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
);

-- =====================================================
-- 2. Fix asset_types - restrict to authenticated users
-- =====================================================
DROP POLICY IF EXISTS "Users can view system and tenant types" ON public.asset_types;
DROP POLICY IF EXISTS "Admins can manage tenant types" ON public.asset_types;

CREATE POLICY "Authenticated users can view types" 
ON public.asset_types 
FOR SELECT 
TO authenticated
USING (
  ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id())) 
  AND deleted_at IS NULL
);

CREATE POLICY "Admins can manage types" 
ON public.asset_types 
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
);

-- =====================================================
-- 3. Fix asset_subtypes - restrict to authenticated users
-- =====================================================
DROP POLICY IF EXISTS "Users can view system and tenant subtypes" ON public.asset_subtypes;
DROP POLICY IF EXISTS "Admins can manage tenant subtypes" ON public.asset_subtypes;

CREATE POLICY "Authenticated users can view subtypes" 
ON public.asset_subtypes 
FOR SELECT 
TO authenticated
USING (
  ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id())) 
  AND deleted_at IS NULL
);

CREATE POLICY "Admins can manage subtypes" 
ON public.asset_subtypes 
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
);

-- =====================================================
-- 4. Fix ptw_types - restrict to authenticated users
-- =====================================================
DROP POLICY IF EXISTS "Users can view PTW types in their tenant" ON public.ptw_types;
DROP POLICY IF EXISTS "Admins can manage PTW types" ON public.ptw_types;

CREATE POLICY "Authenticated users can view PTW types" 
ON public.ptw_types 
FOR SELECT 
TO authenticated
USING (
  ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id())) 
  AND deleted_at IS NULL
);

CREATE POLICY "Admins can manage PTW types" 
ON public.ptw_types 
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
);

-- =====================================================
-- 5. Fix ptw_simops_rules - restrict to authenticated users
-- =====================================================
DROP POLICY IF EXISTS "Users can view SIMOPS rules" ON public.ptw_simops_rules;
DROP POLICY IF EXISTS "Admins can manage SIMOPS rules" ON public.ptw_simops_rules;

CREATE POLICY "Authenticated users can view SIMOPS rules" 
ON public.ptw_simops_rules 
FOR SELECT 
TO authenticated
USING (
  ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id())) 
  AND deleted_at IS NULL
);

CREATE POLICY "Admins can manage SIMOPS rules" 
ON public.ptw_simops_rules 
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
);

-- =====================================================
-- 6. Fix email_delivery_logs - restrict service role policy
-- =====================================================
DROP POLICY IF EXISTS "Service role can manage email logs" ON public.email_delivery_logs;

-- More restrictive service role policy - only allow INSERT for email sending
CREATE POLICY "Service role can insert email logs" 
ON public.email_delivery_logs 
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update email logs" 
ON public.email_delivery_logs 
FOR UPDATE
TO service_role
USING (true);

-- =====================================================
-- 7. Fix mfa_backup_codes - tighten service role policy
-- =====================================================
DROP POLICY IF EXISTS "Service role can manage backup codes" ON public.mfa_backup_codes;

-- More restrictive - only allow service role INSERT and UPDATE
CREATE POLICY "Service role can insert backup codes" 
ON public.mfa_backup_codes 
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update backup codes" 
ON public.mfa_backup_codes 
FOR UPDATE
TO service_role
USING (true);

-- =====================================================
-- 8. Fix push_subscriptions - tighten service role policy
-- =====================================================
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.push_subscriptions;

-- More restrictive - service role for sending notifications only needs SELECT and UPDATE
CREATE POLICY "Service role can select subscriptions" 
ON public.push_subscriptions 
FOR SELECT
TO service_role
USING (deleted_at IS NULL);

CREATE POLICY "Service role can update subscriptions" 
ON public.push_subscriptions 
FOR UPDATE
TO service_role
USING (true);