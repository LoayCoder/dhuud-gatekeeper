
-- ============================================
-- PRODUCTION SECURITY HARDENING MIGRATION
-- ============================================

-- Phase 1: Create security role check function
CREATE OR REPLACE FUNCTION public.has_security_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'admin'::app_role) 
    OR has_role_by_code(_user_id, 'security_officer')
    OR has_role_by_code(_user_id, 'security_supervisor')
    OR has_role_by_code(_user_id, 'security_guard')
$$;

-- Phase 2: Fix profiles table - prevent cross-tenant admin access
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles in their tenant"
ON profiles FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
);

-- Phase 3: Fix tenant_profiles table - prevent cross-tenant admin access
DROP POLICY IF EXISTS "Admins can manage all tenant profiles" ON tenant_profiles;
CREATE POLICY "Admins can manage tenant profiles in their tenant"
ON tenant_profiles FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
);

-- Phase 4: Fix visitors table - restrict PII access to security roles
DROP POLICY IF EXISTS "Users can view visitors in their tenant only" ON visitors;
CREATE POLICY "Security and admins can view visitors"
ON visitors FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND has_security_access(auth.uid())
);

-- Phase 5: Fix security_blacklist table - restrict to security roles
DROP POLICY IF EXISTS "Users can view blacklist in their tenant only" ON security_blacklist;
CREATE POLICY "Security and admins can view blacklist"
ON security_blacklist FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND has_security_access(auth.uid())
);

-- Phase 6: Fix support_tickets - users see only their own tickets
DROP POLICY IF EXISTS "Users can view tickets in their tenant" ON support_tickets;
CREATE POLICY "Users can view own tickets or admins can view all"
ON support_tickets FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Phase 7: Fix tenant_billing_records - admins only
DROP POLICY IF EXISTS "Users can view their tenant billing" ON tenant_billing_records;
CREATE POLICY "Admins can view tenant billing"
ON tenant_billing_records FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Phase 8: Fix subscription_requests - admins only for viewing
DROP POLICY IF EXISTS "Tenants can view their own requests" ON subscription_requests;
CREATE POLICY "Admins can view subscription requests"
ON subscription_requests FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Phase 9: Fix manager_team - restrict to own hierarchy
DROP POLICY IF EXISTS "Managers can view their team hierarchy" ON manager_team;
CREATE POLICY "Users can view own team or admins can view all"
ON manager_team FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND (
    manager_id = auth.uid()
    OR user_id = auth.uid()
    OR is_in_team_hierarchy(auth.uid(), user_id)
    OR is_admin(auth.uid())
  )
);

-- Phase 10: Fix visit_requests - hosts and security only
DROP POLICY IF EXISTS "Users can view visit requests in their tenant only" ON visit_requests;
CREATE POLICY "Hosts and security can view visit requests"
ON visit_requests FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND (
    host_id = auth.uid()
    OR has_security_access(auth.uid())
  )
);
