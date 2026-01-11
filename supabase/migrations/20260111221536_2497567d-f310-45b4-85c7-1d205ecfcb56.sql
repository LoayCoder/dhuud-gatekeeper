-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "security_team_members_update_policy" ON security_team_members;

-- Create fixed UPDATE policy with WITH CHECK clause
CREATE POLICY "security_team_members_update_policy" ON security_team_members
FOR UPDATE 
USING (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()))
WITH CHECK (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));