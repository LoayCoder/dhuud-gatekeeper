-- Allow admins to insert new invitation codes
CREATE POLICY "Admins can insert invitations"
ON public.invitations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete invitation codes
CREATE POLICY "Admins can delete invitations"
ON public.invitations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));