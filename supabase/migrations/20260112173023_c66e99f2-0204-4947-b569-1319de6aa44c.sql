-- Allow all normal users to view contractor companies for incident reporting
-- Since all users have the normal_user role assigned automatically, this effectively allows
-- all authenticated users within the same tenant to see the contractor dropdown

CREATE POLICY "Normal users can view contractor companies"
ON public.contractor_companies
FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND has_role_by_code(auth.uid(), 'normal_user')
);