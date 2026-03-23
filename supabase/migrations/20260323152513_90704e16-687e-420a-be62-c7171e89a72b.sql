
-- Fix RLS policies on asset_inspection_part_results
-- Drop broken policies that use app_metadata (which is NULL for all users)
DROP POLICY IF EXISTS "Users can view own tenant part results" ON public.asset_inspection_part_results;
DROP POLICY IF EXISTS "Users can insert own tenant part results" ON public.asset_inspection_part_results;
DROP POLICY IF EXISTS "Users can update own tenant part results" ON public.asset_inspection_part_results;
DROP POLICY IF EXISTS "Users can delete own tenant part results" ON public.asset_inspection_part_results;

-- Recreate with profiles-based tenant lookup
CREATE POLICY "Users can view own tenant part results"
ON public.asset_inspection_part_results FOR SELECT TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Users can insert own tenant part results"
ON public.asset_inspection_part_results FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Users can update own tenant part results"
ON public.asset_inspection_part_results FOR UPDATE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
))
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Users can delete own tenant part results"
ON public.asset_inspection_part_results FOR DELETE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

-- Fix RLS policies on asset_type_parts
DROP POLICY IF EXISTS "Users can view own tenant parts" ON public.asset_type_parts;
DROP POLICY IF EXISTS "Users can insert own tenant parts" ON public.asset_type_parts;
DROP POLICY IF EXISTS "Users can update own tenant parts" ON public.asset_type_parts;
DROP POLICY IF EXISTS "Users can delete own tenant parts" ON public.asset_type_parts;

-- Recreate with profiles-based tenant lookup (also allow system-wide parts where tenant_id IS NULL)
CREATE POLICY "Users can view own tenant parts"
ON public.asset_type_parts FOR SELECT TO authenticated
USING (
  tenant_id IS NULL
  OR tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
  )
);

CREATE POLICY "Users can insert own tenant parts"
ON public.asset_type_parts FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Users can update own tenant parts"
ON public.asset_type_parts FOR UPDATE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
))
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Users can delete own tenant parts"
ON public.asset_type_parts FOR DELETE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));
