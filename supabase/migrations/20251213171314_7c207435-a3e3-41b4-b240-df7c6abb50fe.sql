-- =====================================================
-- AUDIT FIX MIGRATION: Comprehensive Schema Improvements
-- =====================================================

-- 1. ENVIRONMENTAL INCIDENT DETAILS TABLE
-- Addresses gap: Missing environmental-specific tracking for spills/emissions
CREATE TABLE IF NOT EXISTS public.environmental_incident_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Spill Details
  spill_volume_liters NUMERIC(12,2),
  spill_unit TEXT DEFAULT 'liters', -- liters, gallons, barrels
  substance_name TEXT,
  substance_type TEXT, -- chemical, oil, wastewater, hazardous, non_hazardous
  cas_number TEXT, -- Chemical Abstracts Service number
  
  -- Environmental Impact
  affected_area_sqm NUMERIC(12,2),
  affected_medium TEXT[], -- soil, water, air, groundwater
  reached_waterway BOOLEAN DEFAULT false,
  waterway_name TEXT,
  
  -- Emission Details (for air quality incidents)
  emission_type TEXT, -- gas, particulate, vapor, odor
  emission_duration_hours NUMERIC(8,2),
  estimated_emission_kg NUMERIC(12,4),
  
  -- Containment & Response
  containment_method TEXT,
  containment_successful BOOLEAN,
  cleanup_required BOOLEAN DEFAULT true,
  cleanup_completed BOOLEAN DEFAULT false,
  cleanup_completed_at TIMESTAMP WITH TIME ZONE,
  cleanup_contractor TEXT,
  estimated_cleanup_cost_sar NUMERIC(12,2),
  actual_cleanup_cost_sar NUMERIC(12,2),
  
  -- Regulatory
  reportable_quantity_exceeded BOOLEAN DEFAULT false,
  regulatory_notification_required BOOLEAN DEFAULT false,
  regulatory_notification_sent_at TIMESTAMP WITH TIME ZONE,
  regulatory_agency TEXT,
  regulatory_reference_number TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.environmental_incident_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view environmental details in their tenant"
  ON environmental_incident_details FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create environmental details"
  ON environmental_incident_details FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() AND has_hsse_incident_access(auth.uid()));

CREATE POLICY "HSSE users can update environmental details"
  ON environmental_incident_details FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_hsse_incident_access(auth.uid()));

-- Index for performance
CREATE INDEX idx_env_incident_details_incident ON environmental_incident_details(incident_id);
CREATE INDEX idx_env_incident_details_tenant ON environmental_incident_details(tenant_id);

-- 2. ASSET FINANCIAL TRACKING - Add columns to hsse_assets
-- Addresses gap: Missing depreciation and financial tracking
ALTER TABLE public.hsse_assets 
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS depreciation_method TEXT DEFAULT 'straight_line', -- straight_line, declining_balance, units_of_production
  ADD COLUMN IF NOT EXISTS depreciation_rate_pct NUMERIC(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS salvage_value NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_book_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS last_valuation_date DATE,
  ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS insurance_value NUMERIC(14,2);

-- 3. SPARE PARTS / INVENTORY MODULE
-- Addresses gap: No inventory tracking for maintenance parts
CREATE TABLE IF NOT EXISTS public.maintenance_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Part Identification
  part_number TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  
  -- Classification
  category TEXT, -- consumable, spare, tool, safety_equipment
  manufacturer TEXT,
  model_number TEXT,
  
  -- Inventory
  quantity_in_stock INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 1,
  max_stock_level INTEGER,
  reorder_point INTEGER DEFAULT 5,
  unit_of_measure TEXT DEFAULT 'unit', -- unit, box, set, liter, kg
  
  -- Pricing
  unit_cost NUMERIC(12,2),
  currency TEXT DEFAULT 'SAR',
  last_purchase_date DATE,
  last_purchase_price NUMERIC(12,2),
  
  -- Storage
  storage_location TEXT,
  bin_number TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_critical BOOLEAN DEFAULT false, -- Critical for operations
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Junction table: Parts required for maintenance schedules
CREATE TABLE IF NOT EXISTS public.maintenance_schedule_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES asset_maintenance_schedules(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES maintenance_parts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  quantity_required INTEGER DEFAULT 1,
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(schedule_id, part_id)
);

-- Parts usage tracking (for actual consumption)
CREATE TABLE IF NOT EXISTS public.maintenance_part_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  part_id UUID NOT NULL REFERENCES maintenance_parts(id),
  asset_id UUID REFERENCES hsse_assets(id),
  schedule_id UUID REFERENCES asset_maintenance_schedules(id),
  
  quantity_used INTEGER NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  used_by UUID REFERENCES profiles(id),
  work_order_reference TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for inventory tables
ALTER TABLE public.maintenance_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedule_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_part_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_parts
CREATE POLICY "Users can view parts in their tenant"
  ON maintenance_parts FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Asset managers can manage parts"
  ON maintenance_parts FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

-- RLS Policies for maintenance_schedule_parts
CREATE POLICY "Users can view schedule parts in their tenant"
  ON maintenance_schedule_parts FOR SELECT
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Asset managers can manage schedule parts"
  ON maintenance_schedule_parts FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

-- RLS Policies for maintenance_part_usage
CREATE POLICY "Users can view part usage in their tenant"
  ON maintenance_part_usage FOR SELECT
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Asset managers can create part usage"
  ON maintenance_part_usage FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

-- Indexes for inventory tables
CREATE INDEX idx_maint_parts_tenant ON maintenance_parts(tenant_id);
CREATE INDEX idx_maint_parts_number ON maintenance_parts(part_number);
CREATE INDEX idx_maint_schedule_parts_schedule ON maintenance_schedule_parts(schedule_id);
CREATE INDEX idx_maint_part_usage_part ON maintenance_part_usage(part_id);
CREATE INDEX idx_maint_part_usage_asset ON maintenance_part_usage(asset_id);

-- 4. SECURITY PATROL MODULE
-- Addresses gap: Missing patrol/checkpoint tracking for security module
CREATE TABLE IF NOT EXISTS public.security_patrol_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  
  -- Location scope
  branch_id UUID REFERENCES branches(id),
  site_id UUID REFERENCES sites(id),
  building_id UUID REFERENCES buildings(id),
  
  -- Schedule
  frequency TEXT DEFAULT 'hourly', -- hourly, shift, daily, custom
  frequency_interval_hours INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  -- Route details
  estimated_duration_minutes INTEGER,
  route_map_path TEXT, -- Storage path for route image/PDF
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Checkpoints along patrol routes
CREATE TABLE IF NOT EXISTS public.patrol_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  route_id UUID NOT NULL REFERENCES security_patrol_routes(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  
  -- Position in route
  sequence_order INTEGER NOT NULL,
  
  -- Location
  floor_zone_id UUID REFERENCES floors_zones(id),
  location_details TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  
  -- QR/NFC for verification
  qr_code_data TEXT,
  nfc_tag_id TEXT,
  
  -- Requirements
  photo_required BOOLEAN DEFAULT false,
  notes_required BOOLEAN DEFAULT false,
  min_time_at_checkpoint_seconds INTEGER DEFAULT 30,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Patrol sessions (actual patrol runs)
CREATE TABLE IF NOT EXISTS public.security_patrols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  route_id UUID NOT NULL REFERENCES security_patrol_routes(id),
  
  reference_id TEXT,
  
  -- Guard/Officer
  patrol_officer_id UUID REFERENCES profiles(id),
  
  -- Timing
  scheduled_start TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, missed, incomplete
  
  -- Metrics
  checkpoints_visited INTEGER DEFAULT 0,
  checkpoints_total INTEGER,
  compliance_percentage NUMERIC(5,2),
  
  -- Issues
  incidents_reported INTEGER DEFAULT 0,
  issues_found TEXT,
  
  notes TEXT,
  supervisor_review_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Individual checkpoint logs during patrol
CREATE TABLE IF NOT EXISTS public.patrol_checkpoint_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patrol_id UUID NOT NULL REFERENCES security_patrols(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES patrol_checkpoints(id),
  
  -- Timing
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  time_spent_seconds INTEGER,
  
  -- Verification
  scan_method TEXT, -- qr_code, nfc, manual, gps
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  
  -- Status
  status TEXT DEFAULT 'completed', -- completed, skipped, issue_found
  
  -- Evidence
  photo_path TEXT,
  notes TEXT,
  
  -- Linked incident if issue found
  linked_incident_id UUID REFERENCES incidents(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for security patrol tables
ALTER TABLE public.security_patrol_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_patrols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_checkpoint_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_patrol_routes
CREATE POLICY "Users can view patrol routes in their tenant"
  ON security_patrol_routes FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Security users can manage patrol routes"
  ON security_patrol_routes FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role_by_code(auth.uid(), 'security_officer') OR
    has_role_by_code(auth.uid(), 'security_manager')
  ));

-- RLS Policies for patrol_checkpoints
CREATE POLICY "Users can view checkpoints in their tenant"
  ON patrol_checkpoints FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Security users can manage checkpoints"
  ON patrol_checkpoints FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role_by_code(auth.uid(), 'security_officer') OR
    has_role_by_code(auth.uid(), 'security_manager')
  ));

-- RLS Policies for security_patrols
CREATE POLICY "Users can view patrols in their tenant"
  ON security_patrols FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Security users can manage patrols"
  ON security_patrols FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role_by_code(auth.uid(), 'security_officer') OR
    has_role_by_code(auth.uid(), 'security_manager') OR
    patrol_officer_id = auth.uid()
  ));

-- RLS Policies for patrol_checkpoint_logs
CREATE POLICY "Users can view checkpoint logs in their tenant"
  ON patrol_checkpoint_logs FOR SELECT
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Patrol officers can create checkpoint logs"
  ON patrol_checkpoint_logs FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- Indexes for security patrol tables
CREATE INDEX idx_patrol_routes_tenant ON security_patrol_routes(tenant_id);
CREATE INDEX idx_patrol_checkpoints_route ON patrol_checkpoints(route_id);
CREATE INDEX idx_security_patrols_tenant ON security_patrols(tenant_id);
CREATE INDEX idx_security_patrols_route ON security_patrols(route_id);
CREATE INDEX idx_security_patrols_officer ON security_patrols(patrol_officer_id);
CREATE INDEX idx_security_patrols_status ON security_patrols(status);
CREATE INDEX idx_patrol_logs_patrol ON patrol_checkpoint_logs(patrol_id);

-- Generate patrol reference ID
CREATE OR REPLACE FUNCTION generate_patrol_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM security_patrols
  WHERE tenant_id = NEW.tenant_id
    AND reference_id LIKE 'PTL-' || year_suffix || '-%';
  
  NEW.reference_id := 'PTL-' || year_suffix || '-' || LPAD(sequence_num::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_patrol_reference_id
  BEFORE INSERT ON security_patrols
  FOR EACH ROW
  WHEN (NEW.reference_id IS NULL)
  EXECUTE FUNCTION generate_patrol_reference_id();

-- 5. DATA INTEGRITY FIX: Add deleted_at to inspection_responses
-- Addresses gap: Inconsistent soft delete handling
ALTER TABLE public.area_inspection_responses 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 6. PERFORMANCE INDEXES
-- Critical indexes for high-volume tables
CREATE INDEX IF NOT EXISTS idx_incidents_tenant_status ON incidents(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_tenant_created ON incidents(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_occurred_at ON incidents(tenant_id, occurred_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_corrective_actions_tenant_status ON corrective_actions(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_corrective_actions_assigned ON corrective_actions(assigned_to, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_corrective_actions_due ON corrective_actions(tenant_id, due_date) WHERE deleted_at IS NULL AND status NOT IN ('verified', 'closed');

CREATE INDEX IF NOT EXISTS idx_hsse_assets_tenant_status ON hsse_assets(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hsse_assets_category ON hsse_assets(tenant_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hsse_assets_next_inspection ON hsse_assets(tenant_id, next_inspection_due) WHERE deleted_at IS NULL AND next_inspection_due IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inspection_sessions_tenant_status ON inspection_sessions(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inspection_sessions_template ON inspection_sessions(template_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_active ON profiles(tenant_id, is_active) WHERE is_deleted IS NOT TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE is_deleted IS NOT TRUE;

-- Trigger for updated_at on new tables
CREATE TRIGGER update_environmental_incident_details_updated_at
  BEFORE UPDATE ON environmental_incident_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_parts_updated_at
  BEFORE UPDATE ON maintenance_parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_patrol_routes_updated_at
  BEFORE UPDATE ON security_patrol_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patrol_checkpoints_updated_at
  BEFORE UPDATE ON patrol_checkpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_patrols_updated_at
  BEFORE UPDATE ON security_patrols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();