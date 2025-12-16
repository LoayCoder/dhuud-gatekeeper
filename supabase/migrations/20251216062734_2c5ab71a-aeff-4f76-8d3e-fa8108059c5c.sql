-- =====================================================
-- PTW MODULE DATABASE SCHEMA - PHASE 1
-- =====================================================

-- 1. PTW Types Configuration (Permit Categories)
CREATE TABLE public.ptw_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    name TEXT NOT NULL,
    name_ar TEXT,
    code TEXT NOT NULL,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    requires_gas_test BOOLEAN DEFAULT false,
    requires_loto BOOLEAN DEFAULT false,
    validity_hours INTEGER DEFAULT 8,
    icon_name TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. PTW Projects (Gate 1 - Parent Container)
CREATE TABLE public.ptw_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    reference_id TEXT NOT NULL,
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    site_id UUID REFERENCES public.sites(id),
    building_id UUID REFERENCES public.buildings(id),
    contractor_company_id UUID REFERENCES public.contractor_companies(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT CHECK (status IN ('pending_clearance', 'active', 'suspended', 'completed', 'cancelled')) DEFAULT 'pending_clearance',
    project_manager_id UUID REFERENCES public.profiles(id),
    hsse_coordinator_id UUID REFERENCES public.profiles(id),
    mobilization_percentage INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. PTW Clearance Checks (Gate 1 Requirements)
CREATE TABLE public.ptw_clearance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    project_id UUID REFERENCES public.ptw_projects(id) ON DELETE CASCADE NOT NULL,
    requirement_name TEXT NOT NULL,
    requirement_name_ar TEXT,
    category TEXT CHECK (category IN ('insurance', 'documentation', 'competency', 'equipment', 'hsse', 'security')) DEFAULT 'documentation',
    is_mandatory BOOLEAN DEFAULT true,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'not_applicable')) DEFAULT 'pending',
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    comments TEXT,
    document_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4. Master Permit Record (Gate 2)
CREATE TABLE public.ptw_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    reference_id TEXT NOT NULL,
    project_id UUID REFERENCES public.ptw_projects(id) NOT NULL,
    type_id UUID REFERENCES public.ptw_types(id) NOT NULL,
    status TEXT CHECK (status IN ('draft', 'requested', 'endorsed', 'issued', 'active', 'suspended', 'closed', 'cancelled', 'expired')) DEFAULT 'draft',
    
    -- Location & Context
    site_id UUID REFERENCES public.sites(id),
    building_id UUID REFERENCES public.buildings(id),
    floor_zone_id UUID REFERENCES public.floors_zones(id),
    location_details TEXT,
    gps_lat DOUBLE PRECISION,
    gps_lng DOUBLE PRECISION,
    
    -- Personnel
    applicant_id UUID REFERENCES public.profiles(id) NOT NULL,
    endorser_id UUID REFERENCES public.profiles(id),
    issuer_id UUID REFERENCES public.profiles(id),
    
    -- Timeline
    planned_start_time TIMESTAMPTZ NOT NULL,
    planned_end_time TIMESTAMPTZ NOT NULL,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    extended_until TIMESTAMPTZ,
    extension_count INTEGER DEFAULT 0,
    
    -- Risk Engine
    simops_status TEXT CHECK (simops_status IN ('clear', 'warning', 'conflict')) DEFAULT 'clear',
    simops_notes TEXT,
    risk_assessment_ref TEXT,
    job_description TEXT,
    work_scope TEXT,
    
    -- Emergency
    emergency_contact_name TEXT,
    emergency_contact_number TEXT,
    evacuation_point TEXT,
    
    -- Workflow timestamps
    requested_at TIMESTAMPTZ,
    endorsed_at TIMESTAMPTZ,
    issued_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES public.profiles(id),
    closure_notes TEXT,
    
    -- QR Code
    qr_code_token TEXT UNIQUE,
    
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 5. Lifting Operations Details
CREATE TABLE public.ptw_lifting_details (
    permit_id UUID REFERENCES public.ptw_permits(id) ON DELETE CASCADE PRIMARY KEY,
    lift_type TEXT CHECK (lift_type IN ('standard', 'heavy', 'critical', 'tandem')) DEFAULT 'standard',
    crane_id UUID REFERENCES public.hsse_assets(id),
    crane_description TEXT,
    load_description TEXT NOT NULL,
    load_weight_kg DECIMAL NOT NULL,
    crane_capacity_kg DECIMAL NOT NULL,
    lift_radius_meters DECIMAL,
    lift_height_meters DECIMAL,
    max_wind_speed_knots DECIMAL DEFAULT 20.0,
    current_wind_speed_knots DECIMAL,
    rigger_name TEXT NOT NULL,
    rigger_certification_ref TEXT,
    signal_person_name TEXT,
    lift_plan_url TEXT,
    ground_conditions TEXT,
    outriggers_extended BOOLEAN DEFAULT false,
    exclusion_zone_meters DECIMAL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Radiography Details (X-Ray NDT)
CREATE TABLE public.ptw_radiography_details (
    permit_id UUID REFERENCES public.ptw_permits(id) ON DELETE CASCADE PRIMARY KEY,
    isotope_type TEXT NOT NULL,
    source_strength_curies DECIMAL,
    source_serial_number TEXT,
    barrier_distance_meters DECIMAL NOT NULL CHECK (barrier_distance_meters > 0),
    rpo_name TEXT NOT NULL,
    rpo_license_number TEXT,
    collimator_used BOOLEAN DEFAULT true,
    exposure_time_minutes DECIMAL,
    radiation_area_marked BOOLEAN DEFAULT false,
    dosimeter_readings_before DECIMAL,
    dosimeter_readings_after DECIMAL,
    survey_meter_id TEXT,
    emergency_procedures_reviewed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Excavation Details
CREATE TABLE public.ptw_excavation_details (
    permit_id UUID REFERENCES public.ptw_permits(id) ON DELETE CASCADE PRIMARY KEY,
    excavation_type TEXT CHECK (excavation_type IN ('trench', 'pit', 'shaft', 'tunnel')) DEFAULT 'trench',
    depth_meters DECIMAL NOT NULL,
    length_meters DECIMAL,
    width_meters DECIMAL,
    soil_type TEXT CHECK (soil_type IN ('type_a', 'type_b', 'type_c', 'rock', 'mixed')) DEFAULT 'type_b',
    shoring_method TEXT CHECK (shoring_method IN ('benching', 'sloping', 'shoring', 'shielding', 'none')),
    underground_utilities_checked BOOLEAN DEFAULT false,
    utility_clearance_ref TEXT,
    gas_detection_required BOOLEAN DEFAULT false,
    water_accumulation_controls TEXT,
    access_egress_method TEXT,
    spoil_placement_distance_meters DECIMAL DEFAULT 1.0,
    competent_person_name TEXT NOT NULL,
    daily_inspection_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Confined Space Details
CREATE TABLE public.ptw_confined_space_details (
    permit_id UUID REFERENCES public.ptw_permits(id) ON DELETE CASCADE PRIMARY KEY,
    space_type TEXT CHECK (space_type IN ('tank', 'vessel', 'silo', 'pit', 'sewer', 'duct', 'other')) DEFAULT 'tank',
    space_description TEXT NOT NULL,
    atmospheric_hazards TEXT,
    physical_hazards TEXT,
    entry_method TEXT,
    rescue_plan_url TEXT,
    rescue_team_standby BOOLEAN DEFAULT false,
    rescue_equipment_available BOOLEAN DEFAULT false,
    ventilation_type TEXT CHECK (ventilation_type IN ('natural', 'mechanical', 'forced', 'none')),
    ventilation_cfm DECIMAL,
    attendant_name TEXT NOT NULL,
    attendant_trained BOOLEAN DEFAULT true,
    communication_method TEXT,
    entry_supervisor_name TEXT NOT NULL,
    max_occupants INTEGER DEFAULT 1,
    emergency_extraction_plan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Hot Work Details
CREATE TABLE public.ptw_hot_work_details (
    permit_id UUID REFERENCES public.ptw_permits(id) ON DELETE CASCADE PRIMARY KEY,
    work_type TEXT CHECK (work_type IN ('welding', 'cutting', 'grinding', 'brazing', 'soldering', 'other')) DEFAULT 'welding',
    equipment_type TEXT,
    fire_watch_name TEXT NOT NULL,
    fire_watch_duration_hours DECIMAL DEFAULT 1.0,
    fire_extinguisher_type TEXT DEFAULT 'ABC',
    fire_extinguisher_location TEXT,
    combustibles_removed BOOLEAN DEFAULT false,
    combustibles_covered BOOLEAN DEFAULT false,
    floor_swept BOOLEAN DEFAULT false,
    sprinklers_impaired BOOLEAN DEFAULT false,
    fire_alarm_notified BOOLEAN DEFAULT false,
    gas_test_required BOOLEAN DEFAULT true,
    ventilation_adequate BOOLEAN DEFAULT false,
    flash_back_arrestors BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Electrical Isolation Details
CREATE TABLE public.ptw_electrical_details (
    permit_id UUID REFERENCES public.ptw_permits(id) ON DELETE CASCADE PRIMARY KEY,
    voltage_level TEXT CHECK (voltage_level IN ('low', 'medium', 'high', 'extra_high')) DEFAULT 'low',
    voltage_value DECIMAL,
    equipment_isolated TEXT NOT NULL,
    isolation_points TEXT NOT NULL,
    loto_applied BOOLEAN DEFAULT false,
    loto_tag_numbers TEXT,
    zero_energy_verified BOOLEAN DEFAULT false,
    grounding_applied BOOLEAN DEFAULT false,
    arc_flash_ppe_required BOOLEAN DEFAULT false,
    arc_flash_boundary_meters DECIMAL,
    electrical_competent_person TEXT NOT NULL,
    test_equipment_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Safety Requirements Template
CREATE TABLE public.ptw_safety_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    ptw_type_id UUID REFERENCES public.ptw_types(id) ON DELETE CASCADE,
    requirement_text TEXT NOT NULL,
    requirement_text_ar TEXT,
    is_mandatory BOOLEAN DEFAULT true,
    is_critical BOOLEAN DEFAULT false,
    category TEXT CHECK (category IN ('ppe', 'precautions', 'environmental', 'documents', 'isolation', 'communication', 'emergency')) DEFAULT 'precautions',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 12. Permit Safety Responses
CREATE TABLE public.ptw_safety_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    permit_id UUID REFERENCES public.ptw_permits(id) ON DELETE CASCADE NOT NULL,
    requirement_id UUID REFERENCES public.ptw_safety_requirements(id) NOT NULL,
    is_checked BOOLEAN DEFAULT false,
    is_not_applicable BOOLEAN DEFAULT false,
    comments TEXT,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(permit_id, requirement_id)
);

-- 13. Gas Test Records
CREATE TABLE public.ptw_gas_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    permit_id UUID REFERENCES public.ptw_permits(id) ON DELETE CASCADE NOT NULL,
    test_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    test_location TEXT,
    oxygen_percentage DECIMAL,
    lel_percentage DECIMAL,
    h2s_ppm DECIMAL,
    co_ppm DECIMAL,
    other_gas_name TEXT,
    other_gas_reading DECIMAL,
    result TEXT CHECK (result IN ('pass', 'fail', 'conditional')) DEFAULT 'pass',
    action_taken TEXT,
    tested_by UUID REFERENCES public.profiles(id) NOT NULL,
    equipment_id TEXT,
    equipment_calibration_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Permit Signatures (Digital Handover)
CREATE TABLE public.ptw_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    permit_id UUID REFERENCES public.ptw_permits(id) ON DELETE CASCADE NOT NULL,
    signature_type TEXT CHECK (signature_type IN ('applicant', 'endorser', 'issuer', 'receiver', 'handover', 'closeout', 'extension')) NOT NULL,
    signer_id UUID REFERENCES public.profiles(id) NOT NULL,
    signer_name TEXT NOT NULL,
    signer_role TEXT,
    signature_data TEXT,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. SIMOPS Rules Configuration
CREATE TABLE public.ptw_simops_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    permit_type_a_id UUID REFERENCES public.ptw_types(id) ON DELETE CASCADE NOT NULL,
    permit_type_b_id UUID REFERENCES public.ptw_types(id) ON DELETE CASCADE NOT NULL,
    conflict_type TEXT CHECK (conflict_type IN ('critical', 'high', 'warning')) DEFAULT 'warning',
    minimum_distance_meters DECIMAL NOT NULL DEFAULT 20,
    rule_description TEXT,
    rule_description_ar TEXT,
    auto_reject BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 16. PTW Audit Logs
CREATE TABLE public.ptw_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    permit_id UUID REFERENCES public.ptw_permits(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.ptw_projects(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_ptw_types_tenant ON public.ptw_types(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ptw_projects_tenant ON public.ptw_projects(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ptw_projects_status ON public.ptw_projects(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_ptw_projects_reference ON public.ptw_projects(reference_id);
CREATE INDEX idx_ptw_clearance_project ON public.ptw_clearance_checks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ptw_permits_tenant ON public.ptw_permits(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ptw_permits_project ON public.ptw_permits(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ptw_permits_status ON public.ptw_permits(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_ptw_permits_reference ON public.ptw_permits(reference_id);
CREATE INDEX idx_ptw_permits_qr ON public.ptw_permits(qr_code_token) WHERE qr_code_token IS NOT NULL;
CREATE INDEX idx_ptw_permits_timeline ON public.ptw_permits(planned_start_time, planned_end_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_ptw_permits_location ON public.ptw_permits(gps_lat, gps_lng) WHERE gps_lat IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_ptw_safety_req_type ON public.ptw_safety_requirements(ptw_type_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ptw_safety_resp_permit ON public.ptw_safety_responses(permit_id);
CREATE INDEX idx_ptw_gas_tests_permit ON public.ptw_gas_tests(permit_id);
CREATE INDEX idx_ptw_signatures_permit ON public.ptw_signatures(permit_id);
CREATE INDEX idx_ptw_audit_permit ON public.ptw_audit_logs(permit_id);
CREATE INDEX idx_ptw_audit_project ON public.ptw_audit_logs(project_id);

-- =====================================================
-- REFERENCE ID GENERATORS
-- =====================================================

-- Project Reference ID Generator
CREATE OR REPLACE FUNCTION public.generate_ptw_project_reference_id()
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
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM ptw_projects
  WHERE tenant_id = NEW.tenant_id
    AND reference_id LIKE 'PTWP-' || year_suffix || '-%';
  
  NEW.reference_id := 'PTWP-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_ptw_project_reference
  BEFORE INSERT ON public.ptw_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ptw_project_reference_id();

-- Permit Reference ID Generator
CREATE OR REPLACE FUNCTION public.generate_ptw_permit_reference_id()
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
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM ptw_permits
  WHERE tenant_id = NEW.tenant_id
    AND reference_id LIKE 'PTW-' || year_suffix || '-%';
  
  NEW.reference_id := 'PTW-' || year_suffix || '-' || LPAD(sequence_num::text, 5, '0');
  NEW.qr_code_token := 'PTW-' || encode(gen_random_bytes(16), 'hex');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_ptw_permit_reference
  BEFORE INSERT ON public.ptw_permits
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ptw_permit_reference_id();

-- =====================================================
-- AUTO-CREATE DEFAULT CLEARANCE CHECKS
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_default_ptw_clearance_checks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default clearance requirements
  INSERT INTO ptw_clearance_checks (tenant_id, project_id, requirement_name, requirement_name_ar, category, is_mandatory, sort_order)
  VALUES
    (NEW.tenant_id, NEW.id, 'Valid Liability Insurance', 'تأمين المسؤولية الصالح', 'insurance', true, 1),
    (NEW.tenant_id, NEW.id, 'Workers Compensation Insurance', 'تأمين تعويض العمال', 'insurance', true, 2),
    (NEW.tenant_id, NEW.id, 'Approved Method Statement / RAMS', 'بيان الطريقة المعتمد / تقييم المخاطر', 'documentation', true, 3),
    (NEW.tenant_id, NEW.id, 'HSE Plan Submitted', 'خطة السلامة والصحة المهنية مقدمة', 'hsse', true, 4),
    (NEW.tenant_id, NEW.id, 'Emergency Response Plan', 'خطة الاستجابة للطوارئ', 'hsse', true, 5),
    (NEW.tenant_id, NEW.id, 'Competency Matrix / Certifications', 'مصفوفة الكفاءات / الشهادات', 'competency', true, 6),
    (NEW.tenant_id, NEW.id, 'Tool Box Talk Records', 'سجلات اجتماعات السلامة', 'documentation', false, 7),
    (NEW.tenant_id, NEW.id, 'Equipment Inspection Certificates', 'شهادات فحص المعدات', 'equipment', true, 8),
    (NEW.tenant_id, NEW.id, 'Security Clearance Obtained', 'تصريح أمني محصول', 'security', true, 9),
    (NEW.tenant_id, NEW.id, 'Site Induction Completed', 'التوجيه في الموقع مكتمل', 'hsse', true, 10);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_default_clearance_checks
  AFTER INSERT ON public.ptw_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_ptw_clearance_checks();

-- =====================================================
-- UPDATE PROJECT MOBILIZATION PERCENTAGE
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_ptw_project_mobilization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_mandatory INTEGER;
  approved_mandatory INTEGER;
  new_percentage INTEGER;
  project_status TEXT;
BEGIN
  -- Get counts
  SELECT 
    COUNT(*) FILTER (WHERE is_mandatory = true AND deleted_at IS NULL),
    COUNT(*) FILTER (WHERE is_mandatory = true AND status = 'approved' AND deleted_at IS NULL)
  INTO total_mandatory, approved_mandatory
  FROM ptw_clearance_checks
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- Calculate percentage
  IF total_mandatory > 0 THEN
    new_percentage := ROUND((approved_mandatory::DECIMAL / total_mandatory) * 100);
  ELSE
    new_percentage := 0;
  END IF;
  
  -- Determine status
  IF new_percentage = 100 THEN
    project_status := 'active';
  ELSE
    project_status := 'pending_clearance';
  END IF;
  
  -- Update project
  UPDATE ptw_projects
  SET 
    mobilization_percentage = new_percentage,
    status = CASE WHEN status NOT IN ('suspended', 'completed', 'cancelled') THEN project_status ELSE status END,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_mobilization_on_check
  AFTER INSERT OR UPDATE OR DELETE ON public.ptw_clearance_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ptw_project_mobilization();

-- =====================================================
-- SECURITY DEFINER FUNCTIONS FOR RLS
-- =====================================================

-- Check if user has PTW access
CREATE OR REPLACE FUNCTION public.has_ptw_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'admin'::app_role) 
    OR has_role_by_code(_user_id, 'hsse_manager')
    OR has_role_by_code(_user_id, 'hsse_officer')
    OR has_role_by_code(_user_id, 'hsse_coordinator')
    OR has_role_by_code(_user_id, 'ptw_coordinator')
    OR has_role_by_code(_user_id, 'ptw_issuer')
    OR has_role_by_code(_user_id, 'ptw_endorser')
$$;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- PTW Types
ALTER TABLE public.ptw_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view PTW types in their tenant"
  ON public.ptw_types FOR SELECT
  USING ((tenant_id IS NULL OR tenant_id = get_auth_tenant_id()) AND deleted_at IS NULL);

CREATE POLICY "Admins can manage PTW types"
  ON public.ptw_types FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND (tenant_id IS NULL OR tenant_id = get_auth_tenant_id()));

-- PTW Projects
ALTER TABLE public.ptw_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view PTW projects in their tenant"
  ON public.ptw_projects FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "PTW users can create projects"
  ON public.ptw_projects FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() AND has_ptw_access(auth.uid()));

CREATE POLICY "PTW users can update projects"
  ON public.ptw_projects FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_ptw_access(auth.uid()));

CREATE POLICY "Admins can delete projects"
  ON public.ptw_projects FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- PTW Clearance Checks
ALTER TABLE public.ptw_clearance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clearance checks in their tenant"
  ON public.ptw_clearance_checks FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "PTW users can manage clearance checks"
  ON public.ptw_clearance_checks FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND has_ptw_access(auth.uid()));

-- PTW Permits
ALTER TABLE public.ptw_permits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view permits in their tenant"
  ON public.ptw_permits FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Authenticated users can create permits"
  ON public.ptw_permits FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE POLICY "PTW users and applicants can update permits"
  ON public.ptw_permits FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND (has_ptw_access(auth.uid()) OR applicant_id = auth.uid()));

CREATE POLICY "Admins can delete permits"
  ON public.ptw_permits FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- Specialized Permit Details (Lifting, Radiography, Excavation, etc.)
ALTER TABLE public.ptw_lifting_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptw_radiography_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptw_excavation_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptw_confined_space_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptw_hot_work_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptw_electrical_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lifting details" ON public.ptw_lifting_details FOR SELECT
  USING (EXISTS (SELECT 1 FROM ptw_permits p WHERE p.id = permit_id AND p.tenant_id = get_auth_tenant_id() AND p.deleted_at IS NULL));
CREATE POLICY "PTW users can manage lifting details" ON public.ptw_lifting_details FOR ALL
  USING (EXISTS (SELECT 1 FROM ptw_permits p WHERE p.id = permit_id AND p.tenant_id = get_auth_tenant_id() AND (has_ptw_access(auth.uid()) OR p.applicant_id = auth.uid())));

CREATE POLICY "Users can view radiography details" ON public.ptw_radiography_details FOR SELECT
  USING (EXISTS (SELECT 1 FROM ptw_permits p WHERE p.id = permit_id AND p.tenant_id = get_auth_tenant_id() AND p.deleted_at IS NULL));
CREATE POLICY "PTW users can manage radiography details" ON public.ptw_radiography_details FOR ALL
  USING (EXISTS (SELECT 1 FROM ptw_permits p WHERE p.id = permit_id AND p.tenant_id = get_auth_tenant_id() AND (has_ptw_access(auth.uid()) OR p.applicant_id = auth.uid())));

CREATE POLICY "Users can view excavation details" ON public.ptw_excavation_details FOR SELECT
  USING (EXISTS (SELECT 1 FROM ptw_permits p WHERE p.id = permit_id AND p.tenant_id = get_auth_tenant_id() AND p.deleted_at IS NULL));
CREATE POLICY "PTW users can manage excavation details" ON public.ptw_excavation_details FOR ALL
  USING (EXISTS (SELECT 1 FROM ptw_permits p WHERE p.id = permit_id AND p.tenant_id = get_auth_tenant_id() AND (has_ptw_access(auth.uid()) OR p.applicant_id = auth.uid())));

CREATE POLICY "Users can view confined space details" ON public.ptw_confined_space_details FOR SELECT
  USING (EXISTS (SELECT 1 FROM ptw_permits p WHERE p.id = permit_id AND p.tenant_id = get_auth_tenant_id() AND p.deleted_at IS NULL));
CREATE POLICY "PTW users can manage confined space details" ON public.ptw_confined_space_details FOR ALL
  USING (EXISTS (SELECT 1 FROM ptw_permits p WHERE p.id = permit_id AND p.tenant_id = get_auth_tenant_id() AND (has_ptw_access(auth.uid()) OR p.applicant_id = auth.uid())));

CREATE POLICY "Users can view hot work details" ON public.ptw_hot_work_details FOR SELECT
  USING (EXISTS (SELECT 1 FROM ptw_permits p WHERE p.id = permit_id AND p.tenant_id = get_auth_tenant_id() AND p.deleted_at IS NULL));
CREATE POLICY "PTW users can manage hot work details" ON public.ptw_hot_work_details FOR ALL
  USING (EXISTS (SELECT 1 FROM ptw_permits p WHERE p.id = permit_id AND p.tenant_id = get_auth_tenant_id() AND (has_ptw_access(auth.uid()) OR p.applicant_id = auth.uid())));

CREATE POLICY "Users can view electrical details" ON public.ptw_electrical_details FOR SELECT
  USING (EXISTS (SELECT 1 FROM ptw_permits p WHERE p.id = permit_id AND p.tenant_id = get_auth_tenant_id() AND p.deleted_at IS NULL));
CREATE POLICY "PTW users can manage electrical details" ON public.ptw_electrical_details FOR ALL
  USING (EXISTS (SELECT 1 FROM ptw_permits p WHERE p.id = permit_id AND p.tenant_id = get_auth_tenant_id() AND (has_ptw_access(auth.uid()) OR p.applicant_id = auth.uid())));

-- Safety Requirements
ALTER TABLE public.ptw_safety_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view safety requirements"
  ON public.ptw_safety_requirements FOR SELECT
  USING ((tenant_id IS NULL OR tenant_id = get_auth_tenant_id()) AND deleted_at IS NULL);

CREATE POLICY "PTW users can manage safety requirements"
  ON public.ptw_safety_requirements FOR ALL
  USING (has_ptw_access(auth.uid()) AND (tenant_id IS NULL OR tenant_id = get_auth_tenant_id()));

-- Safety Responses
ALTER TABLE public.ptw_safety_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view safety responses"
  ON public.ptw_safety_responses FOR SELECT
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Users can manage safety responses"
  ON public.ptw_safety_responses FOR ALL
  USING (tenant_id = get_auth_tenant_id());

-- Gas Tests
ALTER TABLE public.ptw_gas_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gas tests"
  ON public.ptw_gas_tests FOR SELECT
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Users can create gas tests"
  ON public.ptw_gas_tests FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE POLICY "PTW users can update gas tests"
  ON public.ptw_gas_tests FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND has_ptw_access(auth.uid()));

-- Signatures
ALTER TABLE public.ptw_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures"
  ON public.ptw_signatures FOR SELECT
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Users can create signatures"
  ON public.ptw_signatures FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- SIMOPS Rules
ALTER TABLE public.ptw_simops_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view SIMOPS rules"
  ON public.ptw_simops_rules FOR SELECT
  USING ((tenant_id IS NULL OR tenant_id = get_auth_tenant_id()) AND deleted_at IS NULL);

CREATE POLICY "Admins can manage SIMOPS rules"
  ON public.ptw_simops_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND (tenant_id IS NULL OR tenant_id = get_auth_tenant_id()));

-- Audit Logs
ALTER TABLE public.ptw_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PTW users can view audit logs"
  ON public.ptw_audit_logs FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND has_ptw_access(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.ptw_audit_logs FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- =====================================================
-- SEED DEFAULT PTW TYPES
-- =====================================================
INSERT INTO public.ptw_types (tenant_id, name, name_ar, code, risk_level, requires_gas_test, requires_loto, validity_hours, icon_name, color, sort_order)
VALUES
  (NULL, 'Hot Work', 'الأعمال الساخنة', 'HOT_WORK', 'high', true, false, 8, 'flame', 'red', 1),
  (NULL, 'Lifting Operations', 'عمليات الرفع', 'LIFTING', 'high', false, false, 8, 'crane', 'orange', 2),
  (NULL, 'Confined Space Entry', 'دخول الأماكن المحصورة', 'CONFINED_SPACE', 'critical', true, true, 8, 'box', 'purple', 3),
  (NULL, 'Excavation', 'أعمال الحفر', 'EXCAVATION', 'high', true, false, 8, 'shovel', 'brown', 4),
  (NULL, 'Radiography / NDT', 'التصوير الإشعاعي', 'RADIOGRAPHY', 'critical', false, false, 4, 'radiation', 'yellow', 5),
  (NULL, 'Electrical Isolation', 'العزل الكهربائي', 'ELECTRICAL', 'high', false, true, 8, 'zap', 'blue', 6),
  (NULL, 'Working at Height', 'العمل على ارتفاع', 'HEIGHT', 'medium', false, false, 8, 'arrow-up', 'cyan', 7);

-- =====================================================
-- SEED DEFAULT SIMOPS RULES
-- =====================================================
INSERT INTO public.ptw_simops_rules (tenant_id, permit_type_a_id, permit_type_b_id, conflict_type, minimum_distance_meters, rule_description, rule_description_ar, auto_reject)
SELECT 
  NULL,
  a.id,
  b.id,
  'critical',
  50,
  'Radiography requires 50m exclusion zone from all other activities',
  'التصوير الإشعاعي يتطلب منطقة استبعاد 50 متر من جميع الأنشطة الأخرى',
  true
FROM ptw_types a, ptw_types b
WHERE a.code = 'RADIOGRAPHY' AND b.code != 'RADIOGRAPHY';

INSERT INTO public.ptw_simops_rules (tenant_id, permit_type_a_id, permit_type_b_id, conflict_type, minimum_distance_meters, rule_description, rule_description_ar, auto_reject)
SELECT 
  NULL,
  a.id,
  b.id,
  'high',
  20,
  'Lifting operations require 20m clearance from excavations due to ground stability risks',
  'عمليات الرفع تتطلب مسافة 20 متر من الحفريات بسبب مخاطر استقرار الأرض',
  false
FROM ptw_types a, ptw_types b
WHERE a.code = 'LIFTING' AND b.code = 'EXCAVATION';

INSERT INTO public.ptw_simops_rules (tenant_id, permit_type_a_id, permit_type_b_id, conflict_type, minimum_distance_meters, rule_description, rule_description_ar, auto_reject)
SELECT 
  NULL,
  a.id,
  b.id,
  'high',
  15,
  'Hot work requires 15m clearance from confined space entries due to atmospheric hazards',
  'الأعمال الساخنة تتطلب مسافة 15 متر من الأماكن المحصورة بسبب المخاطر الجوية',
  false
FROM ptw_types a, ptw_types b
WHERE a.code = 'HOT_WORK' AND b.code = 'CONFINED_SPACE';