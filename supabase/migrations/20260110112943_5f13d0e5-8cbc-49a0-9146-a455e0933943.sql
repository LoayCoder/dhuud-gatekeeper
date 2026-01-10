-- Fix inspection_templates UPDATE policy - change WITH CHECK to TRUE
DROP POLICY IF EXISTS "Allow template updates" ON public.inspection_templates;

CREATE POLICY "Allow template updates"
ON public.inspection_templates
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_asset_management_access(auth.uid())
  )
)
WITH CHECK (TRUE);

-- Fix other tables with same issue

-- asset_cost_transactions
DROP POLICY IF EXISTS "Users can update their tenant cost transactions" ON public.asset_cost_transactions;
CREATE POLICY "Users can update their tenant cost transactions"
ON public.asset_cost_transactions
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- asset_failure_predictions
DROP POLICY IF EXISTS "Users can update their tenant failure predictions" ON public.asset_failure_predictions;
CREATE POLICY "Users can update their tenant failure predictions"
ON public.asset_failure_predictions
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- asset_health_scores
DROP POLICY IF EXISTS "Users can update their tenant health scores" ON public.asset_health_scores;
CREATE POLICY "Users can update their tenant health scores"
ON public.asset_health_scores
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- asset_maintenance_history
DROP POLICY IF EXISTS "Users can update their tenant maintenance history" ON public.asset_maintenance_history;
CREATE POLICY "Users can update their tenant maintenance history"
ON public.asset_maintenance_history
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- branches
DROP POLICY IF EXISTS "Users can update their tenant branches" ON public.branches;
CREATE POLICY "Users can update their tenant branches"
ON public.branches
FOR UPDATE
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL)
WITH CHECK (TRUE);

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';