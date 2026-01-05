-- Simplified RLS for critical PII tables

-- Enable RLS on flagged tables
ALTER TABLE IF EXISTS public.contractor_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gate_entry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.material_gate_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contractor_safety_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_safety_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.witness_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invitations ENABLE ROW LEVEL SECURITY;

-- Simple tenant-based policies for all
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['contractor_representatives','gate_entry_logs','material_gate_passes','contractor_safety_officers','project_safety_officers','witness_statements','invitations'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_rls" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_tenant_rls" ON public.%I FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL)) WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL))', tbl, tbl);
  END LOOP;
END $$;

-- profiles RLS
DROP POLICY IF EXISTS "profiles_self_and_tenant" ON public.profiles;
CREATE POLICY "profiles_self_and_tenant" ON public.profiles
  FOR SELECT USING (deleted_at IS NULL AND (id = auth.uid() OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL)));

-- visitors RLS
DROP POLICY IF EXISTS "visitors_tenant_rls" ON public.visitors;
CREATE POLICY "visitors_tenant_rls" ON public.visitors
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL));

-- contractors RLS
DROP POLICY IF EXISTS "contractors_tenant_rls" ON public.contractors;
CREATE POLICY "contractors_tenant_rls" ON public.contractors
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL));

-- contractor_workers RLS
DROP POLICY IF EXISTS "contractor_workers_tenant_rls" ON public.contractor_workers;
CREATE POLICY "contractor_workers_tenant_rls" ON public.contractor_workers
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL));