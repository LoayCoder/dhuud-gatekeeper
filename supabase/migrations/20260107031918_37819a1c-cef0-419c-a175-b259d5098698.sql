-- Fix the SELECT policy to allow viewing all credentials (including soft-deleted) for the owner
-- This allows the UPDATE operation to properly validate the row after soft-delete
DROP POLICY IF EXISTS "Users can view their own credentials" ON public.webauthn_credentials;

CREATE POLICY "Users can view their own credentials" ON public.webauthn_credentials
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());