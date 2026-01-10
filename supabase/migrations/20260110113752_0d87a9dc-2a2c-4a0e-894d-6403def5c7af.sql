-- ===============================================================
-- COMPREHENSIVE FIX: Clean up all conflicting RLS UPDATE policies
-- Change WITH CHECK (tenant_id = get_auth_tenant_id()) to WITH CHECK (TRUE)
-- ===============================================================

-- PHASE 1: Clean up duplicate UPDATE policies (drop old versions)
-- ---------------------------------------------------------------

-- asset_cost_transactions - drop old conflicting policies
DROP POLICY IF EXISTS "Users can update cost transactions for their tenant" ON public.asset_cost_transactions;
DROP POLICY IF EXISTS "Users can update cost transactions in their tenant" ON public.asset_cost_transactions;

-- asset_failure_predictions - drop old conflicting policies
DROP POLICY IF EXISTS "Users can update failure predictions for their tenant" ON public.asset_failure_predictions;
DROP POLICY IF EXISTS "Users can update failure predictions in their tenant" ON public.asset_failure_predictions;

-- asset_health_scores - drop old conflicting policies
DROP POLICY IF EXISTS "Users can update health scores for their tenant" ON public.asset_health_scores;
DROP POLICY IF EXISTS "Users can update health scores in their tenant" ON public.asset_health_scores;

-- asset_maintenance_history - drop old conflicting policies
DROP POLICY IF EXISTS "Users can update maintenance history for their tenant" ON public.asset_maintenance_history;
DROP POLICY IF EXISTS "Users can update maintenance history in their tenant" ON public.asset_maintenance_history;

-- branches - drop old conflicting policies
DROP POLICY IF EXISTS "Data entry users can update branches" ON public.branches;
DROP POLICY IF EXISTS "Users can update their tenant branches" ON public.branches;

-- PHASE 2: Fix security_zones UPDATE policy
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "security_zones_update_policy" ON public.security_zones;
CREATE POLICY "security_zones_update_policy"
ON public.security_zones
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (is_admin(auth.uid()) OR has_security_access(auth.uid()))
)
WITH CHECK (TRUE);

-- PHASE 3: Fix corrective_actions UPDATE policy
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update corrective actions for their tenant" ON public.corrective_actions;
CREATE POLICY "Users can update corrective actions for their tenant"
ON public.corrective_actions
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- PHASE 4: Fix departments UPDATE policy
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their tenant departments" ON public.departments;
CREATE POLICY "Users can update their tenant departments"
ON public.departments
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- PHASE 5: Fix divisions UPDATE policy
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their tenant divisions" ON public.divisions;
CREATE POLICY "Users can update their tenant divisions"
ON public.divisions
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- PHASE 6: Fix evidence_items UPDATE policy
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update evidence in their tenant" ON public.evidence_items;
CREATE POLICY "Users can update evidence in their tenant"
ON public.evidence_items
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- PHASE 7: Fix hsse_assets UPDATE policy
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update assets in their tenant" ON public.hsse_assets;
CREATE POLICY "Users can update assets in their tenant"
ON public.hsse_assets
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- PHASE 8: Fix incidents UPDATE policies (multiple)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update incidents in their tenant" ON public.incidents;
DROP POLICY IF EXISTS "update_own_incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authorized users can update tenant incidents" ON public.incidents;

CREATE POLICY "Users can update incidents in their tenant"
ON public.incidents
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- PHASE 9: Fix sections UPDATE policy
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their tenant sections" ON public.sections;
CREATE POLICY "Users can update their tenant sections"
ON public.sections
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- PHASE 10: Fix security_shifts UPDATE policy
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "security_shifts_update_policy" ON public.security_shifts;
CREATE POLICY "security_shifts_update_policy"
ON public.security_shifts
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (is_admin(auth.uid()) OR has_security_access(auth.uid()))
)
WITH CHECK (TRUE);

-- PHASE 11: Fix shift_roster UPDATE policy
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "shift_roster_update_policy" ON public.shift_roster;
CREATE POLICY "shift_roster_update_policy"
ON public.shift_roster
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (is_admin(auth.uid()) OR has_security_access(auth.uid()))
)
WITH CHECK (TRUE);

-- PHASE 12: Fix site_sections UPDATE policy
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their tenant site sections" ON public.site_sections;
CREATE POLICY "Users can update their tenant site sections"
ON public.site_sections
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- PHASE 13: Fix sites UPDATE policy
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their tenant sites" ON public.sites;
CREATE POLICY "Users can update their tenant sites"
ON public.sites
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';