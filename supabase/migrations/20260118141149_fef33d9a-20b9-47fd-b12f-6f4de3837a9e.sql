-- Add RLS policy for Contractor Consultants to view all profiles in tenant
-- Required so they can assign actions to any user

CREATE POLICY "Contractor Consultants can view all profiles in tenant"
ON public.profiles FOR SELECT
USING (
  tenant_id = get_profile_tenant_id_bypass(auth.uid())
  AND has_role_by_code(auth.uid(), 'contractor_consultant'::text)
);