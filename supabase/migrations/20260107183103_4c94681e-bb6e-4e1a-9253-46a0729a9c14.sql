-- =====================================================
-- Fix security_shifts soft-delete RLS issue
-- =====================================================

-- Step 1: Drop the overly restrictive ALL policy
DROP POLICY IF EXISTS "Admins can manage security shifts" ON public.security_shifts;

-- Step 2: Create separate policies for each operation

-- INSERT: Allow security users to create shifts
CREATE POLICY "Security users can insert shifts"
  ON public.security_shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_security_access(auth.uid()))
  );

-- UPDATE: Allow security users to update shifts (including soft-delete)
CREATE POLICY "Security users can update shifts"
  ON public.security_shifts
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_auth_tenant_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_security_access(auth.uid()))
  )
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
  );

-- DELETE: Allow hard delete if ever needed
CREATE POLICY "Security users can delete shifts"
  ON public.security_shifts
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_auth_tenant_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_security_access(auth.uid()))
  );

-- Step 3: Add SELECT policy for viewing soft-deleted rows
CREATE POLICY "security_shifts_select_deleted_for_admins"
  ON public.security_shifts
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_auth_tenant_id()
    AND deleted_at IS NOT NULL
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_security_access(auth.uid()))
  );