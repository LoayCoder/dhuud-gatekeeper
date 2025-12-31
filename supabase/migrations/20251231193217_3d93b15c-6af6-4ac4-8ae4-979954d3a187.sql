-- Allow Department Representatives to view profiles in their department for incident review
CREATE POLICY "Department Reps can view department profiles" 
ON public.profiles
FOR SELECT
TO public
USING (
  (tenant_id = get_profile_tenant_id_bypass(auth.uid())) 
  AND has_role_by_code(auth.uid(), 'department_representative')
  AND (
    assigned_department_id = get_profile_department_id_bypass(auth.uid())
    OR id = auth.uid()
  )
);