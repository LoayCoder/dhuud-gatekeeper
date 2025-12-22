-- Fix insecure public invitations RLS policy
-- Remove the public access policy that allows anyone to view invitations by code

DROP POLICY IF EXISTS "Anyone can view invitations by code" ON public.invitations;

-- Create secure policy: Users can only view invitations sent to their email
CREATE POLICY "Users can view invitations for their email"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Ensure admins can manage tenant invitations (may already exist, use CREATE OR REPLACE pattern)
DROP POLICY IF EXISTS "Admins can manage tenant invitations" ON public.invitations;

CREATE POLICY "Admins can manage tenant invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_tenant_admin(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND is_tenant_admin(auth.uid())
);