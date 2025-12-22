-- =====================================================
-- COMPREHENSIVE MULTI-TENANT DATA ISOLATION FIX
-- =====================================================
-- This migration fixes RLS policies across 15+ tables to enforce
-- strict tenant isolation using tenant_id = get_auth_tenant_id()

-- =====================================================
-- 1. Add is_super_admin column to profiles (if not exists)
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- =====================================================
-- 2. Update helper functions (using CREATE OR REPLACE)
-- =====================================================

-- Update is_tenant_admin with proper tenant isolation
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
      AND ura.tenant_id = p.tenant_id  -- Ensure role is for same tenant
      AND r.code = 'admin'
      AND r.is_active = true
  );
$$;

-- Create super admin check for platform-level operations
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND is_super_admin = true
  );
$$;

-- =====================================================
-- 3. Fix RLS policies for LOGIN_HISTORY table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view login history" ON public.login_history;
DROP POLICY IF EXISTS "Tenant admins can view their login history" ON public.login_history;

CREATE POLICY "Tenant admins can view their login history"
ON public.login_history
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_tenant_admin(auth.uid())
);

-- =====================================================
-- 4. Fix RLS policies for MANAGER_TEAM table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage team relationships" ON public.manager_team;
DROP POLICY IF EXISTS "Tenant admins can manage their team relationships" ON public.manager_team;
DROP POLICY IF EXISTS "Users can view their team" ON public.manager_team;
DROP POLICY IF EXISTS "Tenant users can view their team" ON public.manager_team;

CREATE POLICY "Tenant users can view their team"
ON public.manager_team
FOR SELECT
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant admins can manage their team relationships"
ON public.manager_team
FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()))
WITH CHECK (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()));

-- =====================================================
-- 5. Fix RLS policies for TENANT_MODULES table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage tenant modules" ON public.tenant_modules;
DROP POLICY IF EXISTS "Tenant admins can view their modules" ON public.tenant_modules;
DROP POLICY IF EXISTS "Tenant users can view their modules" ON public.tenant_modules;
DROP POLICY IF EXISTS "Super admins can manage tenant modules" ON public.tenant_modules;

CREATE POLICY "Tenant users can view their modules"
ON public.tenant_modules
FOR SELECT
USING (tenant_id = get_auth_tenant_id());

-- Super admin only for managing tenant modules (cross-tenant operation)
CREATE POLICY "Super admins can manage tenant modules"
ON public.tenant_modules
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- 6. Fix RLS policies for TENANT_BILLING_RECORDS table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage billing records" ON public.tenant_billing_records;
DROP POLICY IF EXISTS "Tenant admins can view their billing records" ON public.tenant_billing_records;
DROP POLICY IF EXISTS "Super admins can manage billing records" ON public.tenant_billing_records;

CREATE POLICY "Tenant admins can view their billing records"
ON public.tenant_billing_records
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_tenant_admin(auth.uid())
);

CREATE POLICY "Super admins can manage billing records"
ON public.tenant_billing_records
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- 7. Fix RLS policies for TENANT_PROFILE_USAGE table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage profile usage" ON public.tenant_profile_usage;
DROP POLICY IF EXISTS "Tenant admins can view their profile usage" ON public.tenant_profile_usage;
DROP POLICY IF EXISTS "Super admins can manage profile usage" ON public.tenant_profile_usage;

CREATE POLICY "Tenant admins can view their profile usage"
ON public.tenant_profile_usage
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_tenant_admin(auth.uid())
);

CREATE POLICY "Super admins can manage profile usage"
ON public.tenant_profile_usage
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- 8. Fix RLS policies for USER_ROLE_ASSIGNMENTS table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage user role assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Tenant admins can manage their role assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Tenant users can view their roles" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Tenant users can view roles in their tenant" ON public.user_role_assignments;

CREATE POLICY "Tenant users can view roles in their tenant"
ON public.user_role_assignments
FOR SELECT
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant admins can manage their role assignments"
ON public.user_role_assignments
FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()))
WITH CHECK (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()));

-- =====================================================
-- 9. Fix RLS policies for VISIT_REQUESTS table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage visit requests" ON public.visit_requests;
DROP POLICY IF EXISTS "Tenant users can view their visit requests" ON public.visit_requests;
DROP POLICY IF EXISTS "Tenant users can manage their visit requests" ON public.visit_requests;
DROP POLICY IF EXISTS "Tenant users can create visit requests" ON public.visit_requests;
DROP POLICY IF EXISTS "Tenant users can update their visit requests" ON public.visit_requests;
DROP POLICY IF EXISTS "Tenant admins can delete visit requests" ON public.visit_requests;

CREATE POLICY "Tenant users can view their visit requests"
ON public.visit_requests
FOR SELECT
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant users can create visit requests"
ON public.visit_requests
FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant users can update their visit requests"
ON public.visit_requests
FOR UPDATE
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant admins can delete visit requests"
ON public.visit_requests
FOR DELETE
USING (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()));

-- =====================================================
-- 10. Fix RLS policies for VISITORS table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage visitors" ON public.visitors;
DROP POLICY IF EXISTS "Tenant users can view their visitors" ON public.visitors;
DROP POLICY IF EXISTS "Tenant users can manage their visitors" ON public.visitors;
DROP POLICY IF EXISTS "Tenant users can create visitors" ON public.visitors;
DROP POLICY IF EXISTS "Tenant users can update their visitors" ON public.visitors;
DROP POLICY IF EXISTS "Tenant admins can delete visitors" ON public.visitors;

CREATE POLICY "Tenant users can view their visitors"
ON public.visitors
FOR SELECT
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant users can create visitors"
ON public.visitors
FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant users can update their visitors"
ON public.visitors
FOR UPDATE
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant admins can delete visitors"
ON public.visitors
FOR DELETE
USING (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()));

-- =====================================================
-- 11. Fix RLS policies for INVITATIONS table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Tenant admins can manage their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitations by code" ON public.invitations;

-- Allow public read for invitation code validation (needed for signup flow)
CREATE POLICY "Anyone can view invitations by code"
ON public.invitations
FOR SELECT
USING (true);

CREATE POLICY "Tenant admins can manage their invitations"
ON public.invitations
FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()))
WITH CHECK (tenant_id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()));

-- =====================================================
-- 12. Fix RLS policies for SUBSCRIPTION_REQUESTS table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage subscription requests" ON public.subscription_requests;
DROP POLICY IF EXISTS "Tenant admins can view their subscription requests" ON public.subscription_requests;
DROP POLICY IF EXISTS "Tenant admins can create subscription requests" ON public.subscription_requests;
DROP POLICY IF EXISTS "Super admins can manage all subscription requests" ON public.subscription_requests;

CREATE POLICY "Tenant admins can view their subscription requests"
ON public.subscription_requests
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_tenant_admin(auth.uid())
);

CREATE POLICY "Tenant admins can create subscription requests"
ON public.subscription_requests
FOR INSERT
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND is_tenant_admin(auth.uid())
);

CREATE POLICY "Super admins can manage all subscription requests"
ON public.subscription_requests
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- 13. Fix RLS policies for SUPPORT_TICKETS table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Tenant users can view their support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Tenant users can manage their support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Tenant admins can update support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Super admins can manage all support tickets" ON public.support_tickets;

CREATE POLICY "Tenant users can view their support tickets"
ON public.support_tickets
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  OR created_by = auth.uid()
  OR assigned_to = auth.uid()
);

CREATE POLICY "Users can create support tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant admins can update support tickets"
ON public.support_tickets
FOR UPDATE
USING (
  tenant_id = get_auth_tenant_id() 
  AND (is_tenant_admin(auth.uid()) OR created_by = auth.uid() OR assigned_to = auth.uid())
);

-- Super admins can manage all tickets (for support staff)
CREATE POLICY "Super admins can manage all support tickets"
ON public.support_tickets
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- 14. Fix RLS policies for TENANTS table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenant admins can manage their own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Tenant users can view their tenant" ON public.tenants;
DROP POLICY IF EXISTS "Tenant admins can update their own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;

CREATE POLICY "Tenant users can view their tenant"
ON public.tenants
FOR SELECT
USING (id = get_auth_tenant_id());

CREATE POLICY "Tenant admins can update their own tenant"
ON public.tenants
FOR UPDATE
USING (id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()))
WITH CHECK (id = get_auth_tenant_id() AND is_tenant_admin(auth.uid()));

-- Only super admins can create/delete tenants
CREATE POLICY "Super admins can manage all tenants"
ON public.tenants
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- 15. Fix RLS policies for SLA_CONFIGS table (platform-wide)
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage SLA configs" ON public.sla_configs;
DROP POLICY IF EXISTS "Anyone can view SLA configs" ON public.sla_configs;
DROP POLICY IF EXISTS "Authenticated users can view SLA configs" ON public.sla_configs;
DROP POLICY IF EXISTS "Super admins can manage SLA configs" ON public.sla_configs;

-- SLA configs are platform-wide (no tenant_id), so read for all authenticated
CREATE POLICY "Authenticated users can view SLA configs"
ON public.sla_configs
FOR SELECT
USING (auth.role() = 'authenticated');

-- Only super admins can manage SLA configs
CREATE POLICY "Super admins can manage SLA configs"
ON public.sla_configs
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- 16. Fix RLS policies for AGENT_STATS table (no tenant_id)
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage agent stats" ON public.agent_stats;
DROP POLICY IF EXISTS "Agents can view own stats" ON public.agent_stats;
DROP POLICY IF EXISTS "Users can view their own agent stats" ON public.agent_stats;
DROP POLICY IF EXISTS "Super admins can manage agent stats" ON public.agent_stats;

CREATE POLICY "Users can view their own agent stats"
ON public.agent_stats
FOR SELECT
USING (agent_id = auth.uid());

CREATE POLICY "Super admins can manage agent stats"
ON public.agent_stats
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- 17. Fix RLS policies for ACTION_SLA_CONFIGS table (platform-wide)
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage action SLA configs" ON public.action_sla_configs;
DROP POLICY IF EXISTS "Anyone can view action SLA configs" ON public.action_sla_configs;
DROP POLICY IF EXISTS "Authenticated users can view action SLA configs" ON public.action_sla_configs;
DROP POLICY IF EXISTS "Super admins can manage action SLA configs" ON public.action_sla_configs;

CREATE POLICY "Authenticated users can view action SLA configs"
ON public.action_sla_configs
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins can manage action SLA configs"
ON public.action_sla_configs
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));