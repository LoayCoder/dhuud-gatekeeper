-- Drop the incorrectly created function and recreate without deleted_at check
DROP FUNCTION IF EXISTS public.has_contractor_admin_access(uuid);

CREATE OR REPLACE FUNCTION public.has_contractor_admin_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = p_user_id 
    AND r.code = 'contractor_admin'
  )
$$;

-- Add RLS policies for contractor_companies
CREATE POLICY "Contractor admins can manage contractor companies"
ON contractor_companies FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
);

-- Add RLS policies for contractor_projects
CREATE POLICY "Contractor admins can manage contractor projects"
ON contractor_projects FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
);

-- Add RLS policies for contractor_workers
CREATE POLICY "Contractor admins can manage contractor workers"
ON contractor_workers FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
);

-- Add RLS policies for contractor_representatives
CREATE POLICY "Contractor admins can manage contractor representatives"
ON contractor_representatives FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
);

-- Add RLS policies for material_gate_passes
CREATE POLICY "Contractor admins can manage material gate passes"
ON material_gate_passes FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
);

-- Add RLS policies for gate_pass_items
CREATE POLICY "Contractor admins can manage gate pass items"
ON gate_pass_items FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
);

-- Add RLS policies for gate_pass_photos
CREATE POLICY "Contractor admins can manage gate pass photos"
ON gate_pass_photos FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
);

-- Add RLS policies for induction_videos
CREATE POLICY "Contractor admins can manage induction videos"
ON induction_videos FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
);

-- Add RLS policies for worker_inductions
CREATE POLICY "Contractor admins can manage worker inductions"
ON worker_inductions FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_contractor_admin_access(auth.uid())
);