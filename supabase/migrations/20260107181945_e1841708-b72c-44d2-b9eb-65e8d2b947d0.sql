-- The existing "Security users can manage roster" policy has deleted_at IS NULL in USING
-- This prevents soft-delete because the resulting row no longer matches
-- Solution: Create a dedicated UPDATE policy for soft-deletes without deleted_at check

-- First, drop the ALL policy that's too restrictive
DROP POLICY IF EXISTS "Security users can manage roster" ON public.shift_roster;

-- Create separate policies for each operation
-- INSERT: Only allow on non-deleted (new rows have deleted_at = NULL)
CREATE POLICY "Security users can insert roster"
  ON public.shift_roster
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND has_security_access(auth.uid())
  );

-- UPDATE: Allow security users to update any row in their tenant (including soft-delete)
CREATE POLICY "Security users can update roster"
  ON public.shift_roster
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_auth_tenant_id()
    AND has_security_access(auth.uid())
  )
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
  );

-- DELETE: Allow hard delete if ever needed (but soft-delete is preferred)
CREATE POLICY "Security users can delete roster"
  ON public.shift_roster
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_auth_tenant_id()
    AND has_security_access(auth.uid())
  );