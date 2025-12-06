
-- =====================================================
-- HSSE ASSET MANAGEMENT MODULE - Part 2
-- Functions, Triggers, RLS Policies, Indexes
-- =====================================================

-- 1. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_subtypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsse_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- 2. DATABASE FUNCTIONS
-- =====================================================

-- Check if user has asset management access
CREATE OR REPLACE FUNCTION public.has_asset_management_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'admin'::app_role) 
    OR has_hsse_incident_access(_user_id)
    OR has_security_access(_user_id)
$$;

-- Generate unique asset code
CREATE OR REPLACE FUNCTION public.generate_asset_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(asset_code, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM hsse_assets
  WHERE tenant_id = NEW.tenant_id
    AND asset_code LIKE 'AST-' || year_suffix || '-%';
  
  NEW.asset_code := 'AST-' || year_suffix || '-' || LPAD(sequence_num::text, 5, '0');
  NEW.qr_code_data := NEW.tenant_id || ':' || NEW.id;
  
  RETURN NEW;
END;
$$;

-- Calculate next inspection due date
CREATE OR REPLACE FUNCTION public.calculate_next_inspection_due()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_inspection_date IS NOT NULL THEN
    NEW.next_inspection_due := NEW.last_inspection_date + 
      (COALESCE(NEW.inspection_interval_days, 30) || ' days')::INTERVAL;
  ELSIF NEW.commissioning_date IS NOT NULL AND NEW.inspection_interval_days IS NOT NULL THEN
    NEW.next_inspection_due := NEW.commissioning_date + 
      (NEW.inspection_interval_days || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$;

-- Update maintenance schedule next_due
CREATE OR REPLACE FUNCTION public.calculate_maintenance_next_due()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_performed IS NOT NULL THEN
    NEW.next_due := CASE NEW.frequency_type
      WHEN 'daily' THEN NEW.last_performed + (NEW.frequency_value || ' days')::INTERVAL
      WHEN 'weekly' THEN NEW.last_performed + (NEW.frequency_value * 7 || ' days')::INTERVAL
      WHEN 'monthly' THEN NEW.last_performed + (NEW.frequency_value || ' months')::INTERVAL
      WHEN 'quarterly' THEN NEW.last_performed + (NEW.frequency_value * 3 || ' months')::INTERVAL
      WHEN 'semi_annually' THEN NEW.last_performed + (NEW.frequency_value * 6 || ' months')::INTERVAL
      WHEN 'annually' THEN NEW.last_performed + (NEW.frequency_value || ' years')::INTERVAL
      ELSE NEW.next_due
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Auto-log asset changes
CREATE OR REPLACE FUNCTION public.log_asset_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO asset_audit_logs (tenant_id, asset_id, action, actor_id, old_value, new_value)
    VALUES (
      NEW.tenant_id,
      NEW.id,
      'updated',
      auth.uid(),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO asset_audit_logs (tenant_id, asset_id, action, actor_id, new_value)
    VALUES (
      NEW.tenant_id,
      NEW.id,
      'created',
      auth.uid(),
      to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS tr_generate_asset_code ON public.hsse_assets;
CREATE TRIGGER tr_generate_asset_code
  BEFORE INSERT ON public.hsse_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_asset_code();

DROP TRIGGER IF EXISTS tr_calculate_next_inspection ON public.hsse_assets;
CREATE TRIGGER tr_calculate_next_inspection
  BEFORE INSERT OR UPDATE OF last_inspection_date, inspection_interval_days, commissioning_date
  ON public.hsse_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_next_inspection_due();

DROP TRIGGER IF EXISTS tr_calculate_maintenance_due ON public.asset_maintenance_schedules;
CREATE TRIGGER tr_calculate_maintenance_due
  BEFORE INSERT OR UPDATE OF last_performed, frequency_type, frequency_value
  ON public.asset_maintenance_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_maintenance_next_due();

DROP TRIGGER IF EXISTS tr_log_asset_changes ON public.hsse_assets;
CREATE TRIGGER tr_log_asset_changes
  AFTER INSERT OR UPDATE ON public.hsse_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_asset_changes();

-- Updated_at triggers
DROP TRIGGER IF EXISTS tr_buildings_updated_at ON public.buildings;
CREATE TRIGGER tr_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_floors_zones_updated_at ON public.floors_zones;
CREATE TRIGGER tr_floors_zones_updated_at
  BEFORE UPDATE ON public.floors_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_asset_categories_updated_at ON public.asset_categories;
CREATE TRIGGER tr_asset_categories_updated_at
  BEFORE UPDATE ON public.asset_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_asset_types_updated_at ON public.asset_types;
CREATE TRIGGER tr_asset_types_updated_at
  BEFORE UPDATE ON public.asset_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_asset_subtypes_updated_at ON public.asset_subtypes;
CREATE TRIGGER tr_asset_subtypes_updated_at
  BEFORE UPDATE ON public.asset_subtypes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_hsse_assets_updated_at ON public.hsse_assets;
CREATE TRIGGER tr_hsse_assets_updated_at
  BEFORE UPDATE ON public.hsse_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_asset_maintenance_updated_at ON public.asset_maintenance_schedules;
CREATE TRIGGER tr_asset_maintenance_updated_at
  BEFORE UPDATE ON public.asset_maintenance_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RLS POLICIES
-- =====================================================

-- Buildings policies
CREATE POLICY "Users can view buildings in their tenant"
  ON public.buildings FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Admins can manage buildings"
  ON public.buildings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- Floors/Zones policies
CREATE POLICY "Users can view floors in their tenant"
  ON public.floors_zones FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Admins can manage floors"
  ON public.floors_zones FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- Asset Categories policies
CREATE POLICY "Users can view system and tenant categories"
  ON public.asset_categories FOR SELECT
  USING ((tenant_id IS NULL OR tenant_id = get_auth_tenant_id()) AND deleted_at IS NULL);

CREATE POLICY "Admins can manage tenant categories"
  ON public.asset_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND (tenant_id IS NULL OR tenant_id = get_auth_tenant_id()));

-- Asset Types policies
CREATE POLICY "Users can view system and tenant types"
  ON public.asset_types FOR SELECT
  USING ((tenant_id IS NULL OR tenant_id = get_auth_tenant_id()) AND deleted_at IS NULL);

CREATE POLICY "Admins can manage tenant types"
  ON public.asset_types FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND (tenant_id IS NULL OR tenant_id = get_auth_tenant_id()));

-- Asset Subtypes policies
CREATE POLICY "Users can view system and tenant subtypes"
  ON public.asset_subtypes FOR SELECT
  USING ((tenant_id IS NULL OR tenant_id = get_auth_tenant_id()) AND deleted_at IS NULL);

CREATE POLICY "Admins can manage tenant subtypes"
  ON public.asset_subtypes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND (tenant_id IS NULL OR tenant_id = get_auth_tenant_id()));

-- HSSE Assets policies
CREATE POLICY "Users can view assets in their tenant"
  ON public.hsse_assets FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Asset managers can create assets"
  ON public.hsse_assets FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "Asset managers can update assets"
  ON public.hsse_assets FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_asset_management_access(auth.uid()));

CREATE POLICY "Admins can delete assets"
  ON public.hsse_assets FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- Asset Photos policies
CREATE POLICY "Users can view asset photos in their tenant"
  ON public.asset_photos FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Asset managers can manage photos"
  ON public.asset_photos FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

-- Asset Documents policies
CREATE POLICY "Users can view asset documents in their tenant"
  ON public.asset_documents FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Asset managers can manage documents"
  ON public.asset_documents FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

-- Asset Audit Logs policies
CREATE POLICY "Asset managers can view audit logs"
  ON public.asset_audit_logs FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.asset_audit_logs FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- Asset Maintenance Schedules policies
CREATE POLICY "Users can view maintenance schedules in their tenant"
  ON public.asset_maintenance_schedules FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Asset managers can manage maintenance schedules"
  ON public.asset_maintenance_schedules FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_buildings_tenant_id ON public.buildings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_buildings_site_id ON public.buildings(site_id);
CREATE INDEX IF NOT EXISTS idx_buildings_active ON public.buildings(tenant_id, is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_floors_zones_tenant_id ON public.floors_zones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_floors_zones_building_id ON public.floors_zones(building_id);

CREATE INDEX IF NOT EXISTS idx_asset_categories_tenant_id ON public.asset_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_categories_code ON public.asset_categories(code);
CREATE INDEX IF NOT EXISTS idx_asset_categories_system ON public.asset_categories(is_system) WHERE is_system = true;

CREATE INDEX IF NOT EXISTS idx_asset_types_tenant_id ON public.asset_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_types_category_id ON public.asset_types(category_id);
CREATE INDEX IF NOT EXISTS idx_asset_types_code ON public.asset_types(code);

CREATE INDEX IF NOT EXISTS idx_asset_subtypes_tenant_id ON public.asset_subtypes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_subtypes_type_id ON public.asset_subtypes(type_id);

CREATE INDEX IF NOT EXISTS idx_hsse_assets_tenant_id ON public.hsse_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hsse_assets_category_id ON public.hsse_assets(category_id);
CREATE INDEX IF NOT EXISTS idx_hsse_assets_type_id ON public.hsse_assets(type_id);
CREATE INDEX IF NOT EXISTS idx_hsse_assets_status ON public.hsse_assets(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hsse_assets_site_id ON public.hsse_assets(site_id);
CREATE INDEX IF NOT EXISTS idx_hsse_assets_building_id ON public.hsse_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_hsse_assets_next_inspection ON public.hsse_assets(tenant_id, next_inspection_due) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hsse_assets_asset_code ON public.hsse_assets(tenant_id, asset_code);
CREATE INDEX IF NOT EXISTS idx_hsse_assets_qr_code ON public.hsse_assets(qr_code_data);
CREATE INDEX IF NOT EXISTS idx_hsse_assets_criticality ON public.hsse_assets(tenant_id, criticality_level) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hsse_assets_condition ON public.hsse_assets(tenant_id, condition_rating) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_photos_tenant_id ON public.asset_photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_photos_asset_id ON public.asset_photos(asset_id);

CREATE INDEX IF NOT EXISTS idx_asset_documents_tenant_id ON public.asset_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_asset_id ON public.asset_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_expiry ON public.asset_documents(tenant_id, expiry_date) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_audit_logs_tenant_id ON public.asset_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_audit_logs_asset_id ON public.asset_audit_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_audit_logs_created_at ON public.asset_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_asset_maintenance_tenant_id ON public.asset_maintenance_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset_id ON public.asset_maintenance_schedules(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_next_due ON public.asset_maintenance_schedules(tenant_id, next_due) WHERE deleted_at IS NULL AND is_active = true;
