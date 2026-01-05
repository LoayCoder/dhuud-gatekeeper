-- =============================================================
-- PHASE 1: Fix Core Permission Functions
-- =============================================================

-- 1.1 Update is_admin function (no deleted_at in user_role_assignments)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = p_user_id 
      AND r.code = 'admin'
  )
$$;

-- 1.2 Update is_tenant_admin function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND ura.tenant_id = get_profile_tenant_id_bypass(_user_id)
      AND r.code = 'admin'
      AND r.is_active = true
  );
$$;

-- =============================================================
-- PHASE 2: Fix Invitations Table Policies
-- =============================================================

-- Drop overlapping/conflicting policies
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can manage tenant invitations" ON public.invitations;

-- Create unified admin management policy
CREATE POLICY "Tenant admins can manage invitations" 
ON public.invitations 
FOR ALL 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND (is_tenant_admin(auth.uid()) OR has_hsse_incident_access(auth.uid()))
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND (is_tenant_admin(auth.uid()) OR has_hsse_incident_access(auth.uid()))
);

-- =============================================================
-- PHASE 3: Fix Profiles Table Policies
-- =============================================================

-- Drop old INSERT policy if exists
DROP POLICY IF EXISTS "Admins can insert profiles for their tenant" ON public.profiles;

-- Create cleaner INSERT policy for tenant admins
CREATE POLICY "Admins can insert profiles for their tenant" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND is_tenant_admin(auth.uid())
);

-- =============================================================
-- PHASE 4: Fix User Role Assignments Policies
-- =============================================================

-- Drop conflicting policies that may override tenant-scoped access
DROP POLICY IF EXISTS "Only admins can manage role assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Only admins can delete role assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Only admins can update role assignments" ON public.user_role_assignments;

-- =============================================================
-- PHASE 5: Strengthen Sensitive Data Access
-- =============================================================

-- 5.1 Restrict asset_cost_transactions to asset managers and admins
DROP POLICY IF EXISTS "Users can view cost transactions in their tenant" ON public.asset_cost_transactions;

CREATE POLICY "Asset managers can view cost transactions" 
ON public.asset_cost_transactions 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL
  AND (has_asset_management_access(auth.uid()) OR is_tenant_admin(auth.uid()))
);

-- 5.2 Restrict risk_assessments to HSSE personnel and admins
DROP POLICY IF EXISTS "Tenant isolation for risk_assessments" ON public.risk_assessments;

CREATE POLICY "HSSE and admins can manage risk assessments" 
ON public.risk_assessments 
FOR ALL 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND (has_hsse_incident_access(auth.uid()) OR is_tenant_admin(auth.uid()))
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND (has_hsse_incident_access(auth.uid()) OR is_tenant_admin(auth.uid()))
);