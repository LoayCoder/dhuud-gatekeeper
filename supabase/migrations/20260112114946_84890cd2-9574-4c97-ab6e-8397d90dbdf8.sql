-- P0.1: Fix Overly Permissive RLS Policies (WITH CHECK = true)
-- These policies bypass tenant validation on INSERT/UPDATE operations

-- 1. asset_cost_transactions
DROP POLICY IF EXISTS "Users can update their tenant cost transactions" ON public.asset_cost_transactions;
CREATE POLICY "Users can update their tenant cost transactions"
ON public.asset_cost_transactions FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 2. asset_failure_predictions
DROP POLICY IF EXISTS "Users can update their tenant failure predictions" ON public.asset_failure_predictions;
CREATE POLICY "Users can update their tenant failure predictions"
ON public.asset_failure_predictions FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 3. asset_health_scores
DROP POLICY IF EXISTS "Users can update their tenant health scores" ON public.asset_health_scores;
CREATE POLICY "Users can update their tenant health scores"
ON public.asset_health_scores FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 4. asset_maintenance_history
DROP POLICY IF EXISTS "Users can update their tenant maintenance history" ON public.asset_maintenance_history;
CREATE POLICY "Users can update their tenant maintenance history"
ON public.asset_maintenance_history FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 5. corrective_actions
DROP POLICY IF EXISTS "Users can update corrective actions for their tenant" ON public.corrective_actions;
CREATE POLICY "Users can update corrective actions for their tenant"
ON public.corrective_actions FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 6. departments
DROP POLICY IF EXISTS "Users can update their tenant departments" ON public.departments;
CREATE POLICY "Users can update their tenant departments"
ON public.departments FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 7. divisions
DROP POLICY IF EXISTS "Users can update their tenant divisions" ON public.divisions;
CREATE POLICY "Users can update their tenant divisions"
ON public.divisions FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 8. evidence_items
DROP POLICY IF EXISTS "Users can update evidence in their tenant" ON public.evidence_items;
CREATE POLICY "Users can update evidence in their tenant"
ON public.evidence_items FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 9. hsse_assets
DROP POLICY IF EXISTS "Users can update assets in their tenant" ON public.hsse_assets;
CREATE POLICY "Users can update assets in their tenant"
ON public.hsse_assets FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 10. incidents
DROP POLICY IF EXISTS "Users can update incidents in their tenant" ON public.incidents;
CREATE POLICY "Users can update incidents in their tenant"
ON public.incidents FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 11. inspection_template_items
DROP POLICY IF EXISTS "template_items_update_v3" ON public.inspection_template_items;
CREATE POLICY "template_items_update_v3"
ON public.inspection_template_items FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 12. inspection_templates
DROP POLICY IF EXISTS "templates_tenant_update_v3" ON public.inspection_templates;
CREATE POLICY "templates_tenant_update_v3"
ON public.inspection_templates FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 13. sections
DROP POLICY IF EXISTS "Users can update their tenant sections" ON public.sections;
CREATE POLICY "Users can update their tenant sections"
ON public.sections FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 14. security_shifts
DROP POLICY IF EXISTS "security_shifts_update_policy" ON public.security_shifts;
CREATE POLICY "security_shifts_update_policy"
ON public.security_shifts FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 15. security_zones
DROP POLICY IF EXISTS "security_zones_update_policy" ON public.security_zones;
CREATE POLICY "security_zones_update_policy"
ON public.security_zones FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 16. shift_roster
DROP POLICY IF EXISTS "shift_roster_update_policy" ON public.shift_roster;
CREATE POLICY "shift_roster_update_policy"
ON public.shift_roster FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 17. site_sections
DROP POLICY IF EXISTS "Users can update their tenant site sections" ON public.site_sections;
CREATE POLICY "Users can update their tenant site sections"
ON public.site_sections FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 18. sites
DROP POLICY IF EXISTS "Users can update their tenant sites" ON public.sites;
CREATE POLICY "Users can update their tenant sites"
ON public.sites FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- NOTE: investigation_sla_configs - SKIPPED: Global config table without tenant_id (by design)
-- NOTE: hsse_event_categories, hsse_event_subtypes - SKIPPED: System-wide lookup tables
-- NOTE: login_history, mfa_backup_codes, notifications, webauthn_challenges - Service-role only, acceptable

-- P0.2: Fix Functions with Mutable Search Paths
-- Fix generate_backup_codes
CREATE OR REPLACE FUNCTION public.generate_backup_codes(p_user_id uuid, p_count integer DEFAULT 10)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  codes text[] := '{}';
  new_code text;
  i integer;
BEGIN
  FOR i IN 1..p_count LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    codes := array_append(codes, new_code);
  END LOOP;
  
  DELETE FROM mfa_backup_codes WHERE user_id = p_user_id;
  
  INSERT INTO mfa_backup_codes (user_id, code_hash, created_at)
  SELECT p_user_id, crypt(code, gen_salt('bf')), now()
  FROM unnest(codes) AS code;
  
  RETURN codes;
END;
$function$;

-- Fix check_subscription_limits
CREATE OR REPLACE FUNCTION public.check_subscription_limits(p_tenant_id uuid, p_limit_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  current_count integer;
  max_limit integer;
  plan_record record;
BEGIN
  SELECT p.* INTO plan_record
  FROM tenants t
  JOIN plans p ON p.id = t.plan_id
  WHERE t.id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Tenant not found');
  END IF;
  
  CASE p_limit_type
    WHEN 'users' THEN
      SELECT COUNT(*) INTO current_count FROM profiles WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;
      max_limit := plan_record.max_users;
    WHEN 'sites' THEN
      SELECT COUNT(*) INTO current_count FROM sites WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;
      max_limit := plan_record.max_sites;
    ELSE
      RETURN jsonb_build_object('allowed', true, 'reason', 'Unknown limit type');
  END CASE;
  
  IF max_limit IS NULL OR current_count < max_limit THEN
    RETURN jsonb_build_object('allowed', true, 'current', current_count, 'max', max_limit);
  ELSE
    RETURN jsonb_build_object('allowed', false, 'current', current_count, 'max', max_limit, 'reason', 'Limit reached');
  END IF;
END;
$function$;

-- Fix get_tenant_hierarchy
CREATE OR REPLACE FUNCTION public.get_tenant_hierarchy(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'tenant_id', t.id,
    'tenant_name', t.name,
    'sites', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'sections', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', sec.id,
            'name', sec.name
          ))
          FROM sections sec
          WHERE sec.site_id = s.id AND sec.deleted_at IS NULL
        ), '[]'::jsonb)
      ))
      FROM sites s
      WHERE s.tenant_id = t.id AND s.deleted_at IS NULL
    ), '[]'::jsonb)
  ) INTO result
  FROM tenants t
  WHERE t.id = p_tenant_id;
  
  RETURN result;
END;
$function$;