-- =====================================================
-- HSSA COMPLIANCE MIGRATION
-- Phase 1: Multi-Tenancy, Soft Deletes, Audit Logs
-- =====================================================

-- =====================================================
-- 1A. Add tenant_id to tables missing multi-tenancy
-- =====================================================

-- user_activity_logs
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.user_activity_logs SET tenant_id = (
  SELECT tenant_id FROM public.profiles WHERE id = user_activity_logs.user_id
) WHERE tenant_id IS NULL;

-- ticket_messages
ALTER TABLE public.ticket_messages ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.ticket_messages SET tenant_id = (
  SELECT st.tenant_id FROM public.support_tickets st WHERE st.id = ticket_messages.ticket_id
) WHERE tenant_id IS NULL;

-- trusted_devices
ALTER TABLE public.trusted_devices ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.trusted_devices SET tenant_id = (
  SELECT tenant_id FROM public.profiles WHERE id = trusted_devices.user_id
) WHERE tenant_id IS NULL;

-- mfa_backup_codes
ALTER TABLE public.mfa_backup_codes ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.mfa_backup_codes SET tenant_id = (
  SELECT tenant_id FROM public.profiles WHERE id = mfa_backup_codes.user_id
) WHERE tenant_id IS NULL;

-- Create indexes for tenant_id columns
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_tenant ON public.user_activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_tenant ON public.ticket_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_tenant ON public.trusted_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_tenant ON public.mfa_backup_codes(tenant_id);

-- =====================================================
-- 1B. Add Soft Delete Support (8 tables)
-- =====================================================

ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.divisions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.manager_team ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create partial indexes for efficient WHERE deleted_at IS NULL queries
CREATE INDEX IF NOT EXISTS idx_modules_active ON public.modules(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_divisions_active ON public.divisions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_active ON public.departments(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sections_active ON public.sections(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_branches_active ON public.branches(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sites_active ON public.sites(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_active ON public.invitations(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_manager_team_active ON public.manager_team(tenant_id) WHERE deleted_at IS NULL;

-- =====================================================
-- 1C. Enhance Audit Logs Schema
-- =====================================================

ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS old_value jsonb;
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS new_value jsonb;
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS ip_address text;

-- =====================================================
-- 1D. Update RLS Policies with Tenant Isolation
-- =====================================================

-- user_activity_logs: Update policies to include tenant isolation
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.user_activity_logs;
CREATE POLICY "Users can insert their own activity logs"
ON public.user_activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.user_activity_logs;
CREATE POLICY "Users can view their own activity logs"
ON public.user_activity_logs FOR SELECT
USING (auth.uid() = user_id OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id()));

DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.user_activity_logs;
CREATE POLICY "Admins can view tenant activity logs"
ON public.user_activity_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- trusted_devices: Add tenant isolation
DROP POLICY IF EXISTS "Users can view own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can view own trusted devices"
ON public.trusted_devices FOR SELECT
USING (auth.uid() = user_id AND (tenant_id IS NULL OR tenant_id = get_auth_tenant_id()));

DROP POLICY IF EXISTS "Users can insert own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can insert own trusted devices"
ON public.trusted_devices FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can update own trusted devices"
ON public.trusted_devices FOR UPDATE
USING (auth.uid() = user_id AND (tenant_id IS NULL OR tenant_id = get_auth_tenant_id()));

DROP POLICY IF EXISTS "Users can delete own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can delete own trusted devices"
ON public.trusted_devices FOR DELETE
USING (auth.uid() = user_id AND (tenant_id IS NULL OR tenant_id = get_auth_tenant_id()));

-- mfa_backup_codes: Add tenant isolation
DROP POLICY IF EXISTS "Users can view own backup codes" ON public.mfa_backup_codes;
CREATE POLICY "Users can view own backup codes"
ON public.mfa_backup_codes FOR SELECT
USING (auth.uid() = user_id AND (tenant_id IS NULL OR tenant_id = get_auth_tenant_id()));

DROP POLICY IF EXISTS "Users can delete own backup codes" ON public.mfa_backup_codes;
CREATE POLICY "Users can delete own backup codes"
ON public.mfa_backup_codes FOR DELETE
USING (auth.uid() = user_id AND (tenant_id IS NULL OR tenant_id = get_auth_tenant_id()));

-- ticket_messages: Add tenant isolation
DROP POLICY IF EXISTS "Users can view messages for tickets in their tenant" ON public.ticket_messages;
CREATE POLICY "Users can view messages for tickets in their tenant"
ON public.ticket_messages FOR SELECT
USING (
  (tenant_id = get_auth_tenant_id()) AND 
  ((is_internal = false) OR has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Users can add messages to their tickets" ON public.ticket_messages;
CREATE POLICY "Users can add messages to their tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM support_tickets st
    WHERE st.id = ticket_messages.ticket_id AND st.tenant_id = get_auth_tenant_id()
  )
);

-- =====================================================
-- 1E. Update Database Functions to filter deleted_at
-- =====================================================

-- Update get_tenant_modules_with_overrides
CREATE OR REPLACE FUNCTION public.get_tenant_modules_with_overrides(p_tenant_id uuid)
RETURNS TABLE(module_id uuid, module_code text, module_name text, is_enabled boolean, source text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.id AS module_id,
    m.code AS module_code,
    m.name AS module_name,
    COALESCE(tm.enabled, pm.included_in_base, false) AS is_enabled,
    CASE 
      WHEN tm.id IS NOT NULL THEN 'override'
      WHEN pm.id IS NOT NULL THEN 'plan'
      ELSE 'none'
    END AS source
  FROM public.modules m
  LEFT JOIN public.tenants t ON t.id = p_tenant_id
  LEFT JOIN public.plan_modules pm ON pm.plan_id = t.plan_id AND pm.module_id = m.id
  LEFT JOIN public.tenant_modules tm ON tm.tenant_id = p_tenant_id AND tm.module_id = m.id
  WHERE m.is_active = true AND m.deleted_at IS NULL
  ORDER BY m.sort_order, m.name;
END;
$function$;

-- Update get_team_hierarchy to filter soft deletes
CREATE OR REPLACE FUNCTION public.get_team_hierarchy(p_manager_id uuid)
RETURNS TABLE(user_id uuid, depth integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH RECURSIVE team AS (
    SELECT mt.user_id, 1 as depth 
    FROM manager_team mt
    WHERE mt.manager_id = p_manager_id AND mt.deleted_at IS NULL
    UNION ALL
    SELECT mt.user_id, t.depth + 1
    FROM manager_team mt
    INNER JOIN team t ON mt.manager_id = t.user_id
    WHERE t.depth < 10 AND mt.deleted_at IS NULL
  )
  SELECT DISTINCT user_id, MIN(depth) as depth FROM team GROUP BY user_id;
$function$;

-- Update get_team_hierarchy_with_profiles to filter soft deletes
CREATE OR REPLACE FUNCTION public.get_team_hierarchy_with_profiles(p_manager_id uuid)
RETURNS TABLE(user_id uuid, depth integer, full_name text, job_title text, user_type text, is_active boolean, is_manager boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH RECURSIVE team_hierarchy AS (
    SELECT mt.user_id, 1 as depth
    FROM manager_team mt
    WHERE mt.manager_id = p_manager_id AND mt.deleted_at IS NULL
    UNION ALL
    SELECT mt.user_id, th.depth + 1
    FROM manager_team mt
    INNER JOIN team_hierarchy th ON mt.manager_id = th.user_id
    WHERE th.depth < 10 AND mt.deleted_at IS NULL
  )
  SELECT DISTINCT ON (th.user_id)
    th.user_id,
    th.depth,
    p.full_name,
    p.job_title,
    p.user_type::text,
    p.is_active,
    EXISTS(SELECT 1 FROM manager_team m WHERE m.manager_id = th.user_id AND m.deleted_at IS NULL) as is_manager
  FROM team_hierarchy th
  LEFT JOIN profiles p ON p.id = th.user_id
  ORDER BY th.user_id, th.depth;
$function$;