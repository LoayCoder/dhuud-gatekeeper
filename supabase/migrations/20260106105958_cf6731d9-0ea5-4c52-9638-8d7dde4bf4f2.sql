-- Add INSERT policy for users to create their own MFA status records
CREATE POLICY "Users can insert their own MFA status"
ON tenant_user_mfa_status
FOR INSERT
TO public
WITH CHECK (user_id = auth.uid());