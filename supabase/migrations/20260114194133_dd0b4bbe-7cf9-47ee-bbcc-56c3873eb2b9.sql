-- Phase 4: RLS Policy Updates for Branch Isolation
-- Using can_access_branch helper function from Phase 1

-- 4.1 Critical Tables - Visitors
DROP POLICY IF EXISTS "Users can view visitors in their tenant" ON public.visitors;
DROP POLICY IF EXISTS "Users can insert visitors in their tenant" ON public.visitors;
DROP POLICY IF EXISTS "Users can update visitors in their tenant" ON public.visitors;
DROP POLICY IF EXISTS "Users can delete visitors in their tenant" ON public.visitors;

CREATE POLICY "Branch-isolated view visitors"
ON public.visitors FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert visitors"
ON public.visitors FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update visitors"
ON public.visitors FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
)
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.2 Critical Tables - Gate Entry Logs
DROP POLICY IF EXISTS "Users can view gate entry logs in their tenant" ON public.gate_entry_logs;
DROP POLICY IF EXISTS "Users can insert gate entry logs in their tenant" ON public.gate_entry_logs;

CREATE POLICY "Branch-isolated view gate_entry_logs"
ON public.gate_entry_logs FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert gate_entry_logs"
ON public.gate_entry_logs FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.3 Critical Tables - Contractor Companies
DROP POLICY IF EXISTS "Users can view contractor companies in their tenant" ON public.contractor_companies;
DROP POLICY IF EXISTS "Users can insert contractor companies in their tenant" ON public.contractor_companies;
DROP POLICY IF EXISTS "Users can update contractor companies in their tenant" ON public.contractor_companies;

CREATE POLICY "Branch-isolated view contractor_companies"
ON public.contractor_companies FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert contractor_companies"
ON public.contractor_companies FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update contractor_companies"
ON public.contractor_companies FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
)
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.4 Critical Tables - Contractor Workers
DROP POLICY IF EXISTS "Users can view contractor workers in their tenant" ON public.contractor_workers;
DROP POLICY IF EXISTS "Users can insert contractor workers in their tenant" ON public.contractor_workers;
DROP POLICY IF EXISTS "Users can update contractor workers in their tenant" ON public.contractor_workers;

CREATE POLICY "Branch-isolated view contractor_workers"
ON public.contractor_workers FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert contractor_workers"
ON public.contractor_workers FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update contractor_workers"
ON public.contractor_workers FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
)
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.5 Critical Tables - Incidents
DROP POLICY IF EXISTS "Users can view incidents in their tenant" ON public.incidents;
DROP POLICY IF EXISTS "Users can insert incidents in their tenant" ON public.incidents;
DROP POLICY IF EXISTS "Users can update incidents in their tenant" ON public.incidents;

CREATE POLICY "Branch-isolated view incidents"
ON public.incidents FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert incidents"
ON public.incidents FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update incidents"
ON public.incidents FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
)
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.6 Critical Tables - Inspection Sessions
DROP POLICY IF EXISTS "Users can view inspection sessions in their tenant" ON public.inspection_sessions;
DROP POLICY IF EXISTS "Users can insert inspection sessions in their tenant" ON public.inspection_sessions;
DROP POLICY IF EXISTS "Users can update inspection sessions in their tenant" ON public.inspection_sessions;

CREATE POLICY "Branch-isolated view inspection_sessions"
ON public.inspection_sessions FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert inspection_sessions"
ON public.inspection_sessions FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update inspection_sessions"
ON public.inspection_sessions FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
)
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

-- 4.7 Critical Tables - HSSE Assets
DROP POLICY IF EXISTS "Users can view assets in their tenant" ON public.hsse_assets;
DROP POLICY IF EXISTS "Users can insert assets in their tenant" ON public.hsse_assets;
DROP POLICY IF EXISTS "Users can update assets in their tenant" ON public.hsse_assets;

CREATE POLICY "Branch-isolated view hsse_assets"
ON public.hsse_assets FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
  AND deleted_at IS NULL
);

CREATE POLICY "Branch-isolated insert hsse_assets"
ON public.hsse_assets FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update hsse_assets"
ON public.hsse_assets FOR UPDATE TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
)
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
);