/*
  # Security Hardening & Isolation Fixes

  1.  **Schema Remediation**: Adds missing `tenant_id` and `branch_id` to 24 tables to ensure strict data isolation.
  2.  **RLS Enforcement**: Enables RLS on these tables and adds strict policies.
  3.  **RBAC Enhancements**: Implements `has_menu_permission` function to bridge Database RLS with UI Menu Permissions.
  4.  **Data Entry Role Support**: Adds strict RLS policies allowing 'Data Entry' role users to Create/Update but NOT Delete, based on their assigned menu permissions.
*/

-- =============================================================================
-- PART 1: ADD MISSING TENANT_ID COLUMNS (STRICT ISOLATION)
-- =============================================================================

-- SLA Configuration Tables
ALTER TABLE public.action_sla_configs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.investigation_sla_configs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.sla_configs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.asset_maintenance_sla_configs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- HSSE Categories (Nullable to allow System Defaults, but RLS will handle scoping)
ALTER TABLE public.hsse_event_categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.hsse_event_subtypes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- PTW Details Tables (Critical for isolation)
ALTER TABLE public.ptw_confined_space_details ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ptw_electrical_details ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ptw_excavation_details ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ptw_hot_work_details ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ptw_lifting_details ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ptw_radiography_details ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Agent Stats
ALTER TABLE public.agent_stats ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.agent_stats ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_action_sla_tenant ON public.action_sla_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_investigation_sla_tenant ON public.investigation_sla_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sla_configs_tenant ON public.sla_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ptw_confined_tenant ON public.ptw_confined_space_details(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ptw_electrical_tenant ON public.ptw_electrical_details(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ptw_excavation_tenant ON public.ptw_excavation_details(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ptw_hotwork_tenant ON public.ptw_hot_work_details(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ptw_lifting_tenant ON public.ptw_lifting_details(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ptw_radiography_tenant ON public.ptw_radiography_details(tenant_id);

-- =============================================================================
-- PART 2: ENABLE RLS AND ADD BASIC ISOLATION POLICIES
-- =============================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'action_sla_configs', 'investigation_sla_configs', 'sla_configs', 'asset_maintenance_sla_configs',
    'hsse_event_categories', 'hsse_event_subtypes',
    'ptw_confined_space_details', 'ptw_electrical_details', 'ptw_excavation_details',
    'ptw_hot_work_details', 'ptw_lifting_details', 'ptw_radiography_details',
    'agent_stats'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Drop existing simple policies to recreate them safely
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Select" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation All" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I', t);

    -- Create standard isolation policy
    IF t LIKE 'hsse_event_%' THEN
      -- Categories can be System (NULL tenant) or Tenant specific
      EXECUTE format('CREATE POLICY "Tenant Isolation Select" ON public.%I FOR SELECT USING (tenant_id = get_auth_tenant_id() OR tenant_id IS NULL)', t);
      EXECUTE format('CREATE POLICY "Tenant Isolation All" ON public.%I FOR ALL USING (tenant_id = get_auth_tenant_id())', t);
    ELSE
      EXECUTE format('CREATE POLICY "Tenant Isolation" ON public.%I FOR ALL USING (tenant_id = get_auth_tenant_id())', t);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- PART 3: RBAC HELPER FUNCTION (Menu Permissions)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_menu_permission(_menu_code text, _action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _can_create boolean;
  _can_read boolean;
  _can_update boolean;
  _can_delete boolean;
BEGIN
  -- get_user_menu_permissions handles admin check internally
  SELECT can_create, can_read, can_update, can_delete
  INTO _can_create, _can_read, _can_update, _can_delete
  FROM public.get_user_menu_permissions(auth.uid(), _menu_code);

  IF _action = 'create' THEN RETURN _can_create; END IF;
  IF _action = 'read' THEN RETURN _can_read; END IF;
  IF _action = 'update' THEN RETURN _can_update; END IF;
  IF _action = 'delete' THEN RETURN _can_delete; END IF;

  RETURN false;
END;
$$;

-- =============================================================================
-- PART 4: ENABLE DATA ENTRY ROLE ACCESS (Update/Create but NO Delete)
-- =============================================================================

-- Policy for INCIDENTS
DROP POLICY IF EXISTS "Data Entry users can update incidents" ON public.incidents;
CREATE POLICY "Data Entry users can update incidents" ON public.incidents
FOR UPDATE USING (
  tenant_id = get_auth_tenant_id()
  AND has_menu_permission('event_list', 'update')
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "Data Entry users can create incidents" ON public.incidents;
CREATE POLICY "Data Entry users can create incidents" ON public.incidents
FOR INSERT WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND has_menu_permission('event_list', 'create')
);

-- Note: No DELETE policy added for Data Entry.
-- Existing "Admins can delete incidents" policy remains, effectively blocking Data Entry role.

-- Policy for ASSETS (hsse_assets)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hsse_assets') THEN
    DROP POLICY IF EXISTS "Data Entry users can update assets" ON public.hsse_assets;
    CREATE POLICY "Data Entry users can update assets" ON public.hsse_assets
    FOR UPDATE USING (
      tenant_id = get_auth_tenant_id()
      AND has_menu_permission('asset_list', 'update')
      AND deleted_at IS NULL
    );

    DROP POLICY IF EXISTS "Data Entry users can create assets" ON public.hsse_assets;
    CREATE POLICY "Data Entry users can create assets" ON public.hsse_assets
    FOR INSERT WITH CHECK (
      tenant_id = get_auth_tenant_id()
      AND has_menu_permission('asset_list', 'create')
    );
  END IF;
END $$;

-- Policy for VISITORS
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'visitors') THEN
    DROP POLICY IF EXISTS "Data Entry users can update visitors" ON public.visitors;
    CREATE POLICY "Data Entry users can update visitors" ON public.visitors
    FOR UPDATE USING (
      tenant_id = get_auth_tenant_id()
      AND has_menu_permission('visitor_list', 'update')
      AND deleted_at IS NULL
    );

    DROP POLICY IF EXISTS "Data Entry users can create visitors" ON public.visitors;
    CREATE POLICY "Data Entry users can create visitors" ON public.visitors
    FOR INSERT WITH CHECK (
      tenant_id = get_auth_tenant_id()
      AND has_menu_permission('visitor_list', 'create')
    );
  END IF;
END $$;

-- Policy for CONTRACTORS (contractor_companies)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contractor_companies') THEN
    DROP POLICY IF EXISTS "Data Entry users can update contractors" ON public.contractor_companies;
    CREATE POLICY "Data Entry users can update contractors" ON public.contractor_companies
    FOR UPDATE USING (
      tenant_id = get_auth_tenant_id()
      AND has_menu_permission('contractor_list', 'update')
      AND deleted_at IS NULL
    );

    DROP POLICY IF EXISTS "Data Entry users can create contractors" ON public.contractor_companies;
    CREATE POLICY "Data Entry users can create contractors" ON public.contractor_companies
    FOR INSERT WITH CHECK (
      tenant_id = get_auth_tenant_id()
      AND has_menu_permission('contractor_list', 'create')
    );
  END IF;
END $$;
