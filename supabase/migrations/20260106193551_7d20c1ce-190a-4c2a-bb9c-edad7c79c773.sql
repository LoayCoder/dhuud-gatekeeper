-- Phase 1: Create the Data Entry role
INSERT INTO public.roles (code, name, category, module_access, description, is_active)
VALUES (
  'data_entry',
  'Data Entry',
  'general',
  ARRAY['hsse_core'],
  'Can add and edit data but cannot delete',
  true
)
ON CONFLICT (code) DO NOTHING;

-- Phase 2: Create helper function to check if user can manage data (insert/update)
CREATE OR REPLACE FUNCTION public.can_manage_data(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND ura.tenant_id = public.get_profile_tenant_id_bypass(_user_id)
      AND r.code IN ('admin', 'data_entry')
      AND r.is_active = true
  );
$$;

-- Phase 3: Update RLS policies on BRANCHES table
DROP POLICY IF EXISTS "Tenant admins can manage their branches" ON public.branches;

CREATE POLICY "Data entry users can insert branches" ON public.branches
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
);

CREATE POLICY "Data entry users can update branches" ON public.branches
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
);

CREATE POLICY "Only admins can delete branches" ON public.branches
FOR DELETE TO authenticated
USING (
  tenant_id = public.get_auth_tenant_id() 
  AND public.is_tenant_admin(auth.uid())
);

-- Phase 4: Update RLS policies on DIVISIONS table
DROP POLICY IF EXISTS "Tenant admins can manage their divisions" ON public.divisions;

CREATE POLICY "Data entry users can insert divisions" ON public.divisions
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
);

CREATE POLICY "Data entry users can update divisions" ON public.divisions
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
);

CREATE POLICY "Only admins can delete divisions" ON public.divisions
FOR DELETE TO authenticated
USING (
  tenant_id = public.get_auth_tenant_id() 
  AND public.is_tenant_admin(auth.uid())
);

-- Phase 5: Update RLS policies on DEPARTMENTS table
DROP POLICY IF EXISTS "Tenant admins can manage their departments" ON public.departments;

CREATE POLICY "Data entry users can insert departments" ON public.departments
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
);

CREATE POLICY "Data entry users can update departments" ON public.departments
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
);

CREATE POLICY "Only admins can delete departments" ON public.departments
FOR DELETE TO authenticated
USING (
  tenant_id = public.get_auth_tenant_id() 
  AND public.is_tenant_admin(auth.uid())
);

-- Phase 6: Update RLS policies on SECTIONS table
DROP POLICY IF EXISTS "Tenant admins can manage their sections" ON public.sections;

CREATE POLICY "Data entry users can insert sections" ON public.sections
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
);

CREATE POLICY "Data entry users can update sections" ON public.sections
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
);

CREATE POLICY "Only admins can delete sections" ON public.sections
FOR DELETE TO authenticated
USING (
  tenant_id = public.get_auth_tenant_id() 
  AND public.is_tenant_admin(auth.uid())
);

-- Phase 7: Update RLS policies on SITES table
DROP POLICY IF EXISTS "Tenant admins can manage their sites" ON public.sites;

CREATE POLICY "Data entry users can insert sites" ON public.sites
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
);

CREATE POLICY "Data entry users can update sites" ON public.sites
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_auth_tenant_id() 
  AND public.can_manage_data(auth.uid())
);

CREATE POLICY "Only admins can delete sites" ON public.sites
FOR DELETE TO authenticated
USING (
  tenant_id = public.get_auth_tenant_id() 
  AND public.is_tenant_admin(auth.uid())
);