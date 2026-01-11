-- Fix security_teams RLS policies to use SECURITY DEFINER function
-- This allows guards to see their team/supervisor info via fallback queries

-- Drop existing policies
DROP POLICY IF EXISTS "security_teams_select_policy" ON security_teams;
DROP POLICY IF EXISTS "security_teams_insert_policy" ON security_teams;
DROP POLICY IF EXISTS "security_teams_update_policy" ON security_teams;
DROP POLICY IF EXISTS "security_teams_delete_policy" ON security_teams;

-- Recreate policies using security definer function for tenant isolation
CREATE POLICY "security_teams_select_policy" ON security_teams
FOR SELECT TO authenticated
USING (tenant_id = get_profile_tenant_id_bypass(auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "security_teams_insert_policy" ON security_teams
FOR INSERT TO authenticated
WITH CHECK (tenant_id = get_profile_tenant_id_bypass(auth.uid()));

CREATE POLICY "security_teams_update_policy" ON security_teams
FOR UPDATE TO authenticated
USING (tenant_id = get_profile_tenant_id_bypass(auth.uid()))
WITH CHECK (tenant_id = get_profile_tenant_id_bypass(auth.uid()));

CREATE POLICY "security_teams_delete_policy" ON security_teams
FOR DELETE TO authenticated
USING (tenant_id = get_profile_tenant_id_bypass(auth.uid()));