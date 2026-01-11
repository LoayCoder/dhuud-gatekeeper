-- Drop all existing policies for security_team_members
DROP POLICY IF EXISTS "security_team_members_select_policy" ON security_team_members;
DROP POLICY IF EXISTS "security_team_members_insert_policy" ON security_team_members;
DROP POLICY IF EXISTS "security_team_members_update_policy" ON security_team_members;
DROP POLICY IF EXISTS "security_team_members_delete_policy" ON security_team_members;

-- Recreate SELECT policy (for viewing non-deleted records)
CREATE POLICY "security_team_members_select_policy" ON security_team_members
FOR SELECT
TO authenticated
USING (
  tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())
  AND deleted_at IS NULL
);

-- Recreate INSERT policy
CREATE POLICY "security_team_members_insert_policy" ON security_team_members
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())
);

-- Recreate UPDATE policy - allows soft-deletes by only checking tenant_id
CREATE POLICY "security_team_members_update_policy" ON security_team_members
FOR UPDATE
TO authenticated
USING (
  tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())
)
WITH CHECK (
  tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())
);

-- Keep DELETE policy for hard deletes (if ever needed by admins)
CREATE POLICY "security_team_members_delete_policy" ON security_team_members
FOR DELETE
TO authenticated
USING (
  tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())
);