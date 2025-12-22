-- Phase 4: Fix public role policies - Change to authenticated role for PII tables
-- FINAL VERSION - All column names verified

-- =====================================================
-- 1. Fix contractors table
-- =====================================================
DROP POLICY IF EXISTS "Users can view contractors in tenant" ON public.contractors;
DROP POLICY IF EXISTS "Security users can manage contractors" ON public.contractors;

CREATE POLICY "Authenticated users can view contractors" 
ON public.contractors 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL
);

CREATE POLICY "Security users can manage contractors" 
ON public.contractors 
FOR ALL
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_security_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_security_access(auth.uid())
);

-- =====================================================
-- 2. Fix contractor_workers table
-- =====================================================
DROP POLICY IF EXISTS "Security users can view contractor workers" ON public.contractor_workers;
DROP POLICY IF EXISTS "Security supervisors can approve workers" ON public.contractor_workers;
DROP POLICY IF EXISTS "Contractor reps can manage own workers" ON public.contractor_workers;
DROP POLICY IF EXISTS "Admins can manage contractor workers" ON public.contractor_workers;

CREATE POLICY "Security users can view workers" 
ON public.contractor_workers 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_security_access(auth.uid())
);

CREATE POLICY "Security supervisors can approve workers" 
ON public.contractor_workers 
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_security_access(auth.uid())
);

CREATE POLICY "Contractor reps can manage own workers" 
ON public.contractor_workers 
FOR ALL
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND EXISTS (
    SELECT 1 FROM contractor_representatives cr
    WHERE cr.company_id = contractor_workers.company_id 
      AND cr.user_id = auth.uid() 
      AND cr.deleted_at IS NULL
  )
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND EXISTS (
    SELECT 1 FROM contractor_representatives cr
    WHERE cr.company_id = contractor_workers.company_id 
      AND cr.user_id = auth.uid() 
      AND cr.deleted_at IS NULL
  )
);

CREATE POLICY "Admins can manage workers" 
ON public.contractor_workers 
FOR ALL
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_admin(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND is_admin(auth.uid())
);

-- =====================================================
-- 3. Fix visitors table (uses is_active)
-- =====================================================
DROP POLICY IF EXISTS "Security and admins can view visitors" ON public.visitors;
DROP POLICY IF EXISTS "Tenant users can view their visitors" ON public.visitors;
DROP POLICY IF EXISTS "Tenant users can create visitors" ON public.visitors;
DROP POLICY IF EXISTS "Tenant users can update their visitors" ON public.visitors;
DROP POLICY IF EXISTS "Users can create visitors" ON public.visitors;
DROP POLICY IF EXISTS "Admins can update visitors" ON public.visitors;
DROP POLICY IF EXISTS "Admins can delete visitors" ON public.visitors;
DROP POLICY IF EXISTS "Tenant admins can delete visitors" ON public.visitors;

CREATE POLICY "Security can view all visitors" 
ON public.visitors 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_active = true 
  AND has_security_access(auth.uid())
);

CREATE POLICY "Tenant users can view visitors" 
ON public.visitors 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_active = true
);

CREATE POLICY "Authenticated users can create visitors" 
ON public.visitors 
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

CREATE POLICY "Security can update visitors" 
ON public.visitors 
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_active = true 
  AND has_security_access(auth.uid())
);

CREATE POLICY "Admins can delete visitors" 
ON public.visitors 
FOR DELETE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_admin(auth.uid())
);

-- =====================================================
-- 4. Fix gate_entry_logs table
-- =====================================================
DROP POLICY IF EXISTS "Users can view gate entries in tenant" ON public.gate_entry_logs;
DROP POLICY IF EXISTS "Security users can manage gate entries" ON public.gate_entry_logs;

CREATE POLICY "Security can view gate entries" 
ON public.gate_entry_logs 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_security_access(auth.uid())
);

CREATE POLICY "Security can manage gate entries" 
ON public.gate_entry_logs 
FOR ALL
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_security_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_security_access(auth.uid())
);

-- =====================================================
-- 5. Fix witness_statements table (uses assigned_witness_id)
-- =====================================================
DROP POLICY IF EXISTS "Users can view tenant witness statements" ON public.witness_statements;
DROP POLICY IF EXISTS "HSSE users can create witness statements" ON public.witness_statements;
DROP POLICY IF EXISTS "HSSE users can update witness statements" ON public.witness_statements;
DROP POLICY IF EXISTS "Assigned witnesses can view their assigned statements" ON public.witness_statements;
DROP POLICY IF EXISTS "Assigned witnesses can update their assigned statements" ON public.witness_statements;
DROP POLICY IF EXISTS "Admins can delete witness statements" ON public.witness_statements;

CREATE POLICY "HSSE users can view statements" 
ON public.witness_statements 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_hsse_incident_access(auth.uid())
);

CREATE POLICY "Witnesses can view assigned statements" 
ON public.witness_statements 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND assigned_witness_id = auth.uid()
);

CREATE POLICY "HSSE users can create statements" 
ON public.witness_statements 
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_hsse_incident_access(auth.uid())
);

CREATE POLICY "HSSE users can update statements" 
ON public.witness_statements 
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_hsse_incident_access(auth.uid())
);

CREATE POLICY "Witnesses can update assigned statements" 
ON public.witness_statements 
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND assigned_witness_id = auth.uid()
);

CREATE POLICY "Admins can delete statements" 
ON public.witness_statements 
FOR DELETE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_admin(auth.uid())
);

-- =====================================================
-- 6. Fix guard_tracking_history table (NO deleted_at)
-- =====================================================
DROP POLICY IF EXISTS "Guards can view own tracking" ON public.guard_tracking_history;
DROP POLICY IF EXISTS "Guards can insert own tracking" ON public.guard_tracking_history;
DROP POLICY IF EXISTS "Security supervisors can view tracking" ON public.guard_tracking_history;

CREATE POLICY "Guards can view own tracking" 
ON public.guard_tracking_history 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND guard_id = auth.uid()
);

CREATE POLICY "Guards can insert own tracking" 
ON public.guard_tracking_history 
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND guard_id = auth.uid()
);

CREATE POLICY "Security supervisors can view tracking" 
ON public.guard_tracking_history 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND has_security_access(auth.uid())
);

-- =====================================================
-- 7. Fix login_history table
-- =====================================================
DROP POLICY IF EXISTS "Users can view own login history" ON public.login_history;
DROP POLICY IF EXISTS "Admins can view tenant login history" ON public.login_history;
DROP POLICY IF EXISTS "Tenant admins can view their login history" ON public.login_history;
DROP POLICY IF EXISTS "Service role can insert login history" ON public.login_history;

CREATE POLICY "Users can view own login history" 
ON public.login_history 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY "Admins can view tenant login history" 
ON public.login_history 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_admin(auth.uid())
);

CREATE POLICY "Service role can insert login history" 
ON public.login_history 
FOR INSERT
TO service_role
WITH CHECK (true);

-- =====================================================
-- 8. Fix profiles table
-- =====================================================
DROP POLICY IF EXISTS "Users view own profile within tenant" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  id = auth.uid() 
  AND tenant_id = get_auth_tenant_id()
);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_admin(auth.uid())
);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE
TO authenticated
USING (
  id = auth.uid() 
  AND tenant_id = get_auth_tenant_id()
);

-- =====================================================
-- 9. Fix incidents table
-- =====================================================
DROP POLICY IF EXISTS "Users can view own or authorized incidents" ON public.incidents;
DROP POLICY IF EXISTS "Users can create incidents" ON public.incidents;

CREATE POLICY "Users can view authorized incidents" 
ON public.incidents 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND can_view_incident(auth.uid(), reporter_id)
);

CREATE POLICY "Users can create incidents" 
ON public.incidents 
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

-- =====================================================
-- 10. Fix invitations table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can insert invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.invitations;
DROP POLICY IF EXISTS "Tenant admins can manage their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can mark their own invitations as used" ON public.invitations;