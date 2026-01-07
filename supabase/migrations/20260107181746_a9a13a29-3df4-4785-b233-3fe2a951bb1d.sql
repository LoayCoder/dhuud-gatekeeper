-- Add a SELECT policy that allows admins/security users to see soft-deleted shift roster entries
-- This is needed because UPDATE requires the resulting row to be visible via a SELECT policy
CREATE POLICY shift_roster_select_deleted_for_admins
  ON public.shift_roster
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_auth_tenant_id()
    AND deleted_at IS NOT NULL
    AND (is_admin(auth.uid()) OR has_security_access(auth.uid()))
  );