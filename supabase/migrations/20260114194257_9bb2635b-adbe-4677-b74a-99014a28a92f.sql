-- Phase 4 Part 2: RLS for remaining operational tables (corrected)

-- 4.8 Corrective Actions
DROP POLICY IF EXISTS "Users can view corrective actions in their tenant" ON public.corrective_actions;
DROP POLICY IF EXISTS "Users can insert corrective actions in their tenant" ON public.corrective_actions;
DROP POLICY IF EXISTS "Users can update corrective actions in their tenant" ON public.corrective_actions;

CREATE POLICY "Branch-isolated view corrective_actions"
ON public.corrective_actions FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert corrective_actions"
ON public.corrective_actions FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update corrective_actions"
ON public.corrective_actions FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.9 Investigations
DROP POLICY IF EXISTS "Users can view investigations in their tenant" ON public.investigations;
DROP POLICY IF EXISTS "Users can insert investigations in their tenant" ON public.investigations;
DROP POLICY IF EXISTS "Users can update investigations in their tenant" ON public.investigations;

CREATE POLICY "Branch-isolated view investigations"
ON public.investigations FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert investigations"
ON public.investigations FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update investigations"
ON public.investigations FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.10 Divisions
DROP POLICY IF EXISTS "Users can view divisions in their tenant" ON public.divisions;
DROP POLICY IF EXISTS "Users can insert divisions in their tenant" ON public.divisions;
DROP POLICY IF EXISTS "Users can update divisions in their tenant" ON public.divisions;

CREATE POLICY "Branch-isolated view divisions"
ON public.divisions FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert divisions"
ON public.divisions FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update divisions"
ON public.divisions FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.11 Departments
DROP POLICY IF EXISTS "Users can view departments in their tenant" ON public.departments;
DROP POLICY IF EXISTS "Users can insert departments in their tenant" ON public.departments;
DROP POLICY IF EXISTS "Users can update departments in their tenant" ON public.departments;

CREATE POLICY "Branch-isolated view departments"
ON public.departments FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert departments"
ON public.departments FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update departments"
ON public.departments FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.12 Sections
DROP POLICY IF EXISTS "Users can view sections in their tenant" ON public.sections;
DROP POLICY IF EXISTS "Users can insert sections in their tenant" ON public.sections;
DROP POLICY IF EXISTS "Users can update sections in their tenant" ON public.sections;

CREATE POLICY "Branch-isolated view sections"
ON public.sections FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert sections"
ON public.sections FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update sections"
ON public.sections FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.13 Buildings
DROP POLICY IF EXISTS "Users can view buildings in their tenant" ON public.buildings;
DROP POLICY IF EXISTS "Users can insert buildings in their tenant" ON public.buildings;
DROP POLICY IF EXISTS "Users can update buildings in their tenant" ON public.buildings;

CREATE POLICY "Branch-isolated view buildings"
ON public.buildings FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert buildings"
ON public.buildings FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update buildings"
ON public.buildings FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.14 Floors/Zones
DROP POLICY IF EXISTS "Users can view floors_zones in their tenant" ON public.floors_zones;
DROP POLICY IF EXISTS "Users can insert floors_zones in their tenant" ON public.floors_zones;
DROP POLICY IF EXISTS "Users can update floors_zones in their tenant" ON public.floors_zones;

CREATE POLICY "Branch-isolated view floors_zones"
ON public.floors_zones FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert floors_zones"
ON public.floors_zones FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update floors_zones"
ON public.floors_zones FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.15 Security Teams
DROP POLICY IF EXISTS "Users can view security teams in their tenant" ON public.security_teams;
DROP POLICY IF EXISTS "Users can insert security teams in their tenant" ON public.security_teams;
DROP POLICY IF EXISTS "Users can update security teams in their tenant" ON public.security_teams;

CREATE POLICY "Branch-isolated view security_teams"
ON public.security_teams FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert security_teams"
ON public.security_teams FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update security_teams"
ON public.security_teams FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.16 user_branch_assignments RLS (using is_super_admin column)
ALTER TABLE public.user_branch_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own branch assignments" ON public.user_branch_assignments;
DROP POLICY IF EXISTS "Admins can manage branch assignments" ON public.user_branch_assignments;
DROP POLICY IF EXISTS "Users view own branch assignments" ON public.user_branch_assignments;
DROP POLICY IF EXISTS "Admins manage branch assignments" ON public.user_branch_assignments;

CREATE POLICY "Users view own branch assignments"
ON public.user_branch_assignments FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR (SELECT is_super_admin FROM public.profiles WHERE user_id = auth.uid()) = true
);

CREATE POLICY "Admins manage branch assignments"
ON public.user_branch_assignments FOR ALL TO authenticated
USING (
  (SELECT is_super_admin FROM public.profiles WHERE user_id = auth.uid()) = true
);