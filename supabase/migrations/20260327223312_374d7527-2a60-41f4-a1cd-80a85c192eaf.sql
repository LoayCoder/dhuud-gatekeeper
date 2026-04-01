-- Fix INSERT policy: replace inline subquery with robust get_auth_tenant_id()
DROP POLICY IF EXISTS "Branch-isolated insert inspection_sessions" ON public.inspection_sessions;

CREATE POLICY "Branch-isolated insert inspection_sessions"
ON public.inspection_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND (branch_id IS NULL OR can_access_branch(auth.uid(), branch_id))
);

-- Also fix the SELECT policy to be consistent
DROP POLICY IF EXISTS "Branch-isolated view inspection_sessions" ON public.inspection_sessions;

CREATE POLICY "Branch-isolated view inspection_sessions"
ON public.inspection_sessions
FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND (branch_id IS NULL OR can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);