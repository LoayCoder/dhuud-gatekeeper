-- Drop the problematic policy that queries auth.users directly
DROP POLICY IF EXISTS "Users can view invitations for their email" ON public.invitations;

-- Create the fixed policy using auth.email() instead of querying auth.users
CREATE POLICY "Users can view invitations for their email" 
ON public.invitations 
FOR SELECT 
TO authenticated
USING (email = auth.email());