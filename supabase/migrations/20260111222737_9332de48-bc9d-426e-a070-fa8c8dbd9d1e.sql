-- Drop all existing policies for security_team_members
DROP POLICY IF EXISTS "security_team_members_select_policy" ON security_team_members;
DROP POLICY IF EXISTS "security_team_members_insert_policy" ON security_team_members;
DROP POLICY IF EXISTS "security_team_members_update_policy" ON security_team_members;
DROP POLICY IF EXISTS "security_team_members_delete_policy" ON security_team_members;

-- Recreate SELECT policy using security definer function
CREATE POLICY "security_team_members_select_policy" ON security_team_members
FOR SELECT
TO authenticated
USING (
  tenant_id = get_profile_tenant_id_bypass(auth.uid())
  AND deleted_at IS NULL
);

-- Recreate INSERT policy using security definer function
CREATE POLICY "security_team_members_insert_policy" ON security_team_members
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_profile_tenant_id_bypass(auth.uid())
);

-- Recreate UPDATE policy using security definer function
CREATE POLICY "security_team_members_update_policy" ON security_team_members
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_profile_tenant_id_bypass(auth.uid())
)
WITH CHECK (
  tenant_id = get_profile_tenant_id_bypass(auth.uid())
);

-- Recreate DELETE policy using security definer function
CREATE POLICY "security_team_members_delete_policy" ON security_team_members
FOR DELETE
TO authenticated
USING (
  tenant_id = get_profile_tenant_id_bypass(auth.uid())
);