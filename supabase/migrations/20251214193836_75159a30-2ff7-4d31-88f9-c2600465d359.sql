-- =====================================================
-- CONTRACTOR MANAGEMENT MODULE - COMPLETE SCHEMA
-- Phase 1: Tables, RLS, Triggers, Functions, Indexes
-- REORDERED: Create all tables first, then RLS policies
-- =====================================================

-- =====================================================
-- PART 1: CREATE ALL TABLES (NO RLS YET)
-- =====================================================

-- 1. CONTRACTOR COMPANIES
CREATE TABLE public.contractor_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  company_name TEXT NOT NULL,
  company_name_ar TEXT,
  commercial_registration_number TEXT,
  vat_number TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  assigned_client_pm_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  suspension_reason TEXT,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. CONTRACTOR REPRESENTATIVES
CREATE TABLE public.contractor_representatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  company_id UUID NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  mobile_number TEXT NOT NULL,
  email TEXT,
  national_id TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_safety_officer_eligible BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 3. CONTRACTOR PROJECTS
CREATE TABLE public.contractor_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  company_id UUID NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  project_name_ar TEXT,
  project_code TEXT NOT NULL,
  site_id UUID REFERENCES public.sites(id),
  location_description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended', 'cancelled')),
  assigned_workers_count INTEGER NOT NULL DEFAULT 0,
  required_safety_officers INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT valid_project_dates CHECK (end_date >= start_date)
);

-- 4. CONTRACTOR WORKERS
CREATE TABLE public.contractor_workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  company_id UUID NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  national_id TEXT NOT NULL,
  nationality TEXT,
  mobile_number TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ar', 'ur', 'hi', 'fil')),
  photo_path TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 5. PROJECT SAFETY OFFICERS
CREATE TABLE public.project_safety_officers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  project_id UUID NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,
  safety_officer_type TEXT NOT NULL CHECK (safety_officer_type IN ('representative_acting', 'dedicated')),
  representative_id UUID REFERENCES public.contractor_representatives(id),
  worker_id UUID REFERENCES public.contractor_workers(id),
  full_name TEXT NOT NULL,
  mobile_number TEXT,
  certification_number TEXT,
  certification_expiry DATE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 6. PROJECT WORKER ASSIGNMENTS
CREATE TABLE public.project_worker_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  project_id UUID NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.contractor_workers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  removal_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 7. INDUCTION VIDEOS
CREATE TABLE public.induction_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  site_id UUID REFERENCES public.sites(id),
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  language TEXT NOT NULL CHECK (language IN ('en', 'ar', 'ur', 'hi', 'fil')),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_for_days INTEGER NOT NULL DEFAULT 365,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 8. WORKER INDUCTIONS
CREATE TABLE public.worker_inductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  worker_id UUID NOT NULL REFERENCES public.contractor_workers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.induction_videos(id),
  sent_at TIMESTAMPTZ,
  sent_via TEXT CHECK (sent_via IN ('whatsapp', 'email', 'manual')),
  whatsapp_message_id TEXT,
  viewed_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledgment_method TEXT CHECK (acknowledgment_method IN ('whatsapp_reply', 'app_button', 'manual')),
  expires_at DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'acknowledged', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 9. WORKER QR CODES
CREATE TABLE public.worker_qr_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  worker_id UUID NOT NULL REFERENCES public.contractor_workers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,
  qr_token TEXT NOT NULL UNIQUE,
  qr_image_path TEXT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id),
  revocation_reason TEXT CHECK (revocation_reason IN ('project_closed', 'worker_removed', 'contractor_suspended', 'induction_expired', 'manual')),
  whatsapp_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 10. MATERIAL GATE PASSES
CREATE TABLE public.material_gate_passes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  company_id UUID NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.contractor_representatives(id),
  pass_date DATE NOT NULL,
  time_window_start TIME,
  time_window_end TIME,
  material_description TEXT NOT NULL,
  quantity TEXT,
  vehicle_plate TEXT,
  driver_name TEXT,
  driver_id TEXT,
  driver_mobile TEXT,
  pass_type TEXT NOT NULL DEFAULT 'in' CHECK (pass_type IN ('in', 'out', 'in_out')),
  status TEXT NOT NULL DEFAULT 'pending_pm' CHECK (status IN ('pending_pm', 'pending_safety', 'approved', 'rejected', 'used', 'expired', 'cancelled')),
  pm_approved_by UUID REFERENCES public.profiles(id),
  pm_approved_at TIMESTAMPTZ,
  pm_notes TEXT,
  safety_approved_by UUID REFERENCES public.profiles(id),
  safety_approved_at TIMESTAMPTZ,
  safety_notes TEXT,
  rejection_reason TEXT,
  rejected_by UUID REFERENCES public.profiles(id),
  rejected_at TIMESTAMPTZ,
  guard_verified_by UUID REFERENCES public.profiles(id),
  guard_verified_at TIMESTAMPTZ,
  entry_time TIMESTAMPTZ,
  exit_time TIMESTAMPTZ,
  entry_gate_id UUID,
  exit_gate_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 11. CONTRACTOR MODULE AUDIT LOGS
CREATE TABLE public.contractor_module_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'company', 'representative', 'project', 'safety_officer', 
    'worker', 'assignment', 'induction', 'qr_code', 'gate_pass'
  )),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'deleted', 'approved', 'rejected',
    'suspended', 'activated', 'revoked', 'assigned', 'removed',
    'sent', 'viewed', 'acknowledged', 'verified', 'expired'
  )),
  actor_id UUID REFERENCES public.profiles(id),
  actor_type TEXT CHECK (actor_type IN ('admin', 'contractor_rep', 'supervisor', 'guard', 'system')),
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 2: ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.contractor_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_safety_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_worker_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.induction_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_inductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_gate_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_module_audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 3: CREATE RLS POLICIES (AFTER ALL TABLES EXIST)
-- =====================================================

-- contractor_companies policies
CREATE POLICY "Admins can manage contractor companies"
ON public.contractor_companies FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Security users can view contractor companies"
ON public.contractor_companies FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Contractor reps can view own company"
ON public.contractor_companies FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.contractor_representatives cr
    WHERE cr.company_id = contractor_companies.id
      AND cr.user_id = auth.uid()
      AND cr.deleted_at IS NULL
  )
);

-- contractor_representatives policies
CREATE POLICY "Admins can manage contractor reps"
ON public.contractor_representatives FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Security users can view contractor reps"
ON public.contractor_representatives FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Contractor reps can view own company reps"
ON public.contractor_representatives FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.contractor_representatives cr2
      WHERE cr2.company_id = contractor_representatives.company_id
        AND cr2.user_id = auth.uid()
        AND cr2.deleted_at IS NULL
    )
  )
);

-- contractor_projects policies
CREATE POLICY "Admins can manage contractor projects"
ON public.contractor_projects FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Security users can view contractor projects"
ON public.contractor_projects FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Contractor reps can manage own projects"
ON public.contractor_projects FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.contractor_representatives cr
    WHERE cr.company_id = contractor_projects.company_id
      AND cr.user_id = auth.uid()
      AND cr.deleted_at IS NULL
  )
);

-- contractor_workers policies
CREATE POLICY "Admins can manage contractor workers"
ON public.contractor_workers FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Security supervisors can approve workers"
ON public.contractor_workers FOR UPDATE
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_security_access(auth.uid())
);

CREATE POLICY "Security users can view contractor workers"
ON public.contractor_workers FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Contractor reps can manage own workers"
ON public.contractor_workers FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.contractor_representatives cr
    WHERE cr.company_id = contractor_workers.company_id
      AND cr.user_id = auth.uid()
      AND cr.deleted_at IS NULL
  )
);

-- project_safety_officers policies
CREATE POLICY "Admins can manage safety officers"
ON public.project_safety_officers FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Security users can view safety officers"
ON public.project_safety_officers FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Contractor reps can manage own project safety officers"
ON public.project_safety_officers FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.contractor_projects cp
    JOIN public.contractor_representatives cr ON cr.company_id = cp.company_id
    WHERE cp.id = project_safety_officers.project_id
      AND cr.user_id = auth.uid()
      AND cr.deleted_at IS NULL
  )
);

-- project_worker_assignments policies
CREATE POLICY "Admins can manage worker assignments"
ON public.project_worker_assignments FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Security users can view worker assignments"
ON public.project_worker_assignments FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Contractor reps can manage own worker assignments"
ON public.project_worker_assignments FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.contractor_projects cp
    JOIN public.contractor_representatives cr ON cr.company_id = cp.company_id
    WHERE cp.id = project_worker_assignments.project_id
      AND cr.user_id = auth.uid()
      AND cr.deleted_at IS NULL
  )
);

-- induction_videos policies
CREATE POLICY "Admins can manage induction videos"
ON public.induction_videos FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Security users can view induction videos"
ON public.induction_videos FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Contractor reps can view induction videos"
ON public.induction_videos FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND is_active = true
  AND EXISTS (
    SELECT 1 FROM public.contractor_representatives cr
    WHERE cr.tenant_id = induction_videos.tenant_id
      AND cr.user_id = auth.uid()
      AND cr.deleted_at IS NULL
  )
);

-- worker_inductions policies
CREATE POLICY "Admins can manage worker inductions"
ON public.worker_inductions FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Security users can view worker inductions"
ON public.worker_inductions FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Contractor reps can view own worker inductions"
ON public.worker_inductions FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.contractor_workers cw
    JOIN public.contractor_representatives cr ON cr.company_id = cw.company_id
    WHERE cw.id = worker_inductions.worker_id
      AND cr.user_id = auth.uid()
      AND cr.deleted_at IS NULL
  )
);

-- worker_qr_codes policies
CREATE POLICY "Admins can manage worker qr codes"
ON public.worker_qr_codes FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Security users can view and validate qr codes"
ON public.worker_qr_codes FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Contractor reps can view own worker qr codes"
ON public.worker_qr_codes FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.contractor_workers cw
    JOIN public.contractor_representatives cr ON cr.company_id = cw.company_id
    WHERE cw.id = worker_qr_codes.worker_id
      AND cr.user_id = auth.uid()
      AND cr.deleted_at IS NULL
  )
);

-- material_gate_passes policies
CREATE POLICY "Admins can manage material gate passes"
ON public.material_gate_passes FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Security users can manage gate passes"
ON public.material_gate_passes FOR ALL
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Contractor reps can manage own gate passes"
ON public.material_gate_passes FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.contractor_representatives cr
    WHERE cr.company_id = material_gate_passes.company_id
      AND cr.user_id = auth.uid()
      AND cr.deleted_at IS NULL
  )
);

-- contractor_module_audit_logs policies
CREATE POLICY "Admins can view contractor audit logs"
ON public.contractor_module_audit_logs FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs"
ON public.contractor_module_audit_logs FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id());

-- =====================================================
-- PART 4: HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_required_safety_officers(p_worker_count INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN p_worker_count < 20 THEN 0
    ELSE CEIL(p_worker_count::NUMERIC / 20)::INTEGER
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_add_contractor_project(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < 3 
  FROM public.contractor_projects 
  WHERE company_id = p_company_id 
    AND status = 'active' 
    AND deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.validate_worker_qr_access(
  p_qr_token TEXT,
  p_site_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr RECORD;
  v_worker RECORD;
  v_project RECORD;
  v_company RECORD;
  v_induction RECORD;
  v_result JSONB;
  v_errors TEXT[] := '{}';
  v_warnings TEXT[] := '{}';
BEGIN
  SELECT * INTO v_qr FROM public.worker_qr_codes
  WHERE qr_token = p_qr_token AND deleted_at IS NULL;
  
  IF v_qr IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'errors', ARRAY['qr_not_found'], 'warnings', '{}');
  END IF;
  
  IF v_qr.is_revoked THEN
    v_errors := array_append(v_errors, 'qr_revoked');
  END IF;
  
  IF now() < v_qr.valid_from THEN
    v_errors := array_append(v_errors, 'qr_not_yet_valid');
  END IF;
  
  IF now() > v_qr.valid_until THEN
    v_errors := array_append(v_errors, 'qr_expired');
  END IF;
  
  SELECT * INTO v_worker FROM public.contractor_workers
  WHERE id = v_qr.worker_id AND deleted_at IS NULL;
  
  IF v_worker IS NULL THEN
    v_errors := array_append(v_errors, 'worker_not_found');
  ELSIF v_worker.approval_status != 'approved' THEN
    v_errors := array_append(v_errors, 'worker_not_approved');
  END IF;
  
  SELECT * INTO v_project FROM public.contractor_projects
  WHERE id = v_qr.project_id AND deleted_at IS NULL;
  
  IF v_project IS NULL THEN
    v_errors := array_append(v_errors, 'project_not_found');
  ELSIF v_project.status != 'active' THEN
    v_errors := array_append(v_errors, 'project_not_active');
  END IF;
  
  IF p_site_id IS NOT NULL AND v_project.site_id IS NOT NULL AND v_project.site_id != p_site_id THEN
    v_errors := array_append(v_errors, 'site_mismatch');
  END IF;
  
  SELECT * INTO v_company FROM public.contractor_companies
  WHERE id = v_worker.company_id AND deleted_at IS NULL;
  
  IF v_company IS NULL THEN
    v_errors := array_append(v_errors, 'company_not_found');
  ELSIF v_company.status = 'suspended' THEN
    v_errors := array_append(v_errors, 'company_suspended');
  ELSIF v_company.status = 'inactive' THEN
    v_errors := array_append(v_errors, 'company_inactive');
  END IF;
  
  SELECT * INTO v_induction FROM public.worker_inductions
  WHERE worker_id = v_qr.worker_id 
    AND project_id = v_qr.project_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_induction IS NULL THEN
    v_errors := array_append(v_errors, 'no_induction');
  ELSIF v_induction.status != 'acknowledged' THEN
    v_errors := array_append(v_errors, 'induction_not_acknowledged');
  ELSIF v_induction.expires_at < CURRENT_DATE THEN
    v_errors := array_append(v_errors, 'induction_expired');
  ELSIF v_induction.expires_at < CURRENT_DATE + INTERVAL '14 days' THEN
    v_warnings := array_append(v_warnings, 'induction_expiring_soon');
  END IF;
  
  v_result := jsonb_build_object(
    'valid', array_length(v_errors, 1) IS NULL,
    'errors', v_errors,
    'warnings', v_warnings,
    'worker_id', v_worker.id,
    'worker_name', v_worker.full_name,
    'worker_nationality', v_worker.nationality,
    'worker_language', v_worker.preferred_language,
    'worker_photo', v_worker.photo_path,
    'company_id', v_company.id,
    'company_name', v_company.company_name,
    'project_id', v_project.id,
    'project_name', v_project.project_name,
    'project_site_id', v_project.site_id
  );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- PART 5: AUTO-GENERATE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_contractor_project_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(project_code, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM public.contractor_projects
  WHERE tenant_id = NEW.tenant_id
    AND project_code LIKE 'PRJ-' || v_year || '-%';
  
  NEW.project_code := 'PRJ-' || v_year || '-' || LPAD(v_sequence::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_contractor_project_code_trigger
BEFORE INSERT ON public.contractor_projects
FOR EACH ROW
WHEN (NEW.project_code IS NULL OR NEW.project_code = '')
EXECUTE FUNCTION public.generate_contractor_project_code();

CREATE OR REPLACE FUNCTION public.generate_gate_pass_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_number, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM public.material_gate_passes
  WHERE tenant_id = NEW.tenant_id
    AND reference_number LIKE 'MGP-' || v_year || '-%';
  
  NEW.reference_number := 'MGP-' || v_year || '-' || LPAD(v_sequence::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_gate_pass_reference_trigger
BEFORE INSERT ON public.material_gate_passes
FOR EACH ROW
WHEN (NEW.reference_number IS NULL OR NEW.reference_number = '')
EXECUTE FUNCTION public.generate_gate_pass_reference();

-- =====================================================
-- PART 6: BUSINESS RULE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.enforce_max_active_projects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active') THEN
    SELECT COUNT(*) INTO v_active_count
    FROM public.contractor_projects
    WHERE company_id = NEW.company_id
      AND status = 'active'
      AND deleted_at IS NULL
      AND id != NEW.id;
    
    IF v_active_count >= 3 THEN
      RAISE EXCEPTION 'Maximum of 3 active projects per contractor company exceeded. Close an existing project first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_max_active_projects_trigger
BEFORE INSERT OR UPDATE ON public.contractor_projects
FOR EACH ROW
EXECUTE FUNCTION public.enforce_max_active_projects();

CREATE OR REPLACE FUNCTION public.update_project_worker_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_worker_count INTEGER;
  v_required_officers INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;
  
  SELECT COUNT(*) INTO v_worker_count
  FROM public.project_worker_assignments pwa
  JOIN public.contractor_workers cw ON cw.id = pwa.worker_id
  WHERE pwa.project_id = v_project_id
    AND pwa.is_active = true
    AND pwa.deleted_at IS NULL
    AND cw.approval_status = 'approved'
    AND cw.deleted_at IS NULL;
  
  v_required_officers := calculate_required_safety_officers(v_worker_count);
  
  UPDATE public.contractor_projects
  SET 
    assigned_workers_count = v_worker_count,
    required_safety_officers = v_required_officers,
    updated_at = now()
  WHERE id = v_project_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_project_worker_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.project_worker_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_project_worker_count();

CREATE OR REPLACE FUNCTION public.update_worker_count_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    UPDATE public.contractor_projects cp
    SET 
      assigned_workers_count = (
        SELECT COUNT(*) 
        FROM public.project_worker_assignments pwa
        JOIN public.contractor_workers cw ON cw.id = pwa.worker_id
        WHERE pwa.project_id = cp.id
          AND pwa.is_active = true
          AND pwa.deleted_at IS NULL
          AND cw.approval_status = 'approved'
          AND cw.deleted_at IS NULL
      ),
      updated_at = now()
    WHERE cp.id IN (
      SELECT project_id FROM public.project_worker_assignments
      WHERE worker_id = NEW.id AND is_active = true AND deleted_at IS NULL
    );
    
    UPDATE public.contractor_projects cp
    SET required_safety_officers = calculate_required_safety_officers(cp.assigned_workers_count)
    WHERE cp.id IN (
      SELECT project_id FROM public.project_worker_assignments
      WHERE worker_id = NEW.id AND is_active = true AND deleted_at IS NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_worker_count_on_approval_trigger
AFTER UPDATE ON public.contractor_workers
FOR EACH ROW
EXECUTE FUNCTION public.update_worker_count_on_approval();

CREATE OR REPLACE FUNCTION public.revoke_qr_on_project_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed', 'suspended', 'cancelled') AND OLD.status = 'active' THEN
    UPDATE public.worker_qr_codes
    SET 
      is_revoked = true,
      revoked_at = now(),
      revocation_reason = 'project_closed',
      updated_at = now()
    WHERE project_id = NEW.id
      AND is_revoked = false
      AND deleted_at IS NULL;
      
    INSERT INTO public.contractor_module_audit_logs (
      tenant_id, entity_type, entity_id, action, actor_id, actor_type, new_value
    )
    SELECT 
      NEW.tenant_id, 'qr_code', id, 'revoked', auth.uid(), 'system',
      jsonb_build_object('reason', 'project_closed', 'project_id', NEW.id)
    FROM public.worker_qr_codes
    WHERE project_id = NEW.id AND revoked_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER revoke_qr_on_project_status_change_trigger
AFTER UPDATE ON public.contractor_projects
FOR EACH ROW
EXECUTE FUNCTION public.revoke_qr_on_project_status_change();

CREATE OR REPLACE FUNCTION public.revoke_qr_on_company_suspension()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'suspended' AND OLD.status != 'suspended' THEN
    UPDATE public.worker_qr_codes wqc
    SET 
      is_revoked = true,
      revoked_at = now(),
      revocation_reason = 'contractor_suspended',
      updated_at = now()
    FROM public.contractor_workers cw
    WHERE wqc.worker_id = cw.id
      AND cw.company_id = NEW.id
      AND wqc.is_revoked = false
      AND wqc.deleted_at IS NULL;
      
    INSERT INTO public.contractor_module_audit_logs (
      tenant_id, entity_type, entity_id, action, actor_id, actor_type, new_value
    )
    SELECT 
      NEW.tenant_id, 'qr_code', wqc.id, 'revoked', auth.uid(), 'system',
      jsonb_build_object('reason', 'contractor_suspended', 'company_id', NEW.id)
    FROM public.worker_qr_codes wqc
    JOIN public.contractor_workers cw ON cw.id = wqc.worker_id
    WHERE cw.company_id = NEW.id AND wqc.revoked_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER revoke_qr_on_company_suspension_trigger
AFTER UPDATE ON public.contractor_companies
FOR EACH ROW
EXECUTE FUNCTION public.revoke_qr_on_company_suspension();

CREATE OR REPLACE FUNCTION public.revoke_qr_on_worker_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    UPDATE public.worker_qr_codes
    SET 
      is_revoked = true,
      revoked_at = now(),
      revocation_reason = 'worker_removed',
      updated_at = now()
    WHERE worker_id = NEW.worker_id
      AND project_id = NEW.project_id
      AND is_revoked = false
      AND deleted_at IS NULL;
      
    INSERT INTO public.contractor_module_audit_logs (
      tenant_id, entity_type, entity_id, action, actor_id, actor_type, new_value
    )
    SELECT 
      NEW.tenant_id, 'qr_code', id, 'revoked', auth.uid(), 'system',
      jsonb_build_object('reason', 'worker_removed', 'project_id', NEW.project_id, 'worker_id', NEW.worker_id)
    FROM public.worker_qr_codes
    WHERE worker_id = NEW.worker_id AND project_id = NEW.project_id AND revoked_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER revoke_qr_on_worker_removal_trigger
AFTER UPDATE ON public.project_worker_assignments
FOR EACH ROW
EXECUTE FUNCTION public.revoke_qr_on_worker_removal();

-- =====================================================
-- PART 7: PERFORMANCE INDEXES
-- =====================================================
CREATE INDEX idx_contractor_companies_tenant_status ON public.contractor_companies(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contractor_representatives_company ON public.contractor_representatives(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contractor_representatives_user ON public.contractor_representatives(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contractor_projects_company_status ON public.contractor_projects(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contractor_projects_site ON public.contractor_projects(site_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_safety_officers_project ON public.project_safety_officers(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contractor_workers_company_approval ON public.contractor_workers(company_id, approval_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contractor_workers_national_id ON public.contractor_workers(national_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_worker_assignments_project ON public.project_worker_assignments(project_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_worker_assignments_worker ON public.project_worker_assignments(worker_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_induction_videos_site_language ON public.induction_videos(site_id, language) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_worker_inductions_worker_project ON public.worker_inductions(worker_id, project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_inductions_status ON public.worker_inductions(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_qr_codes_token ON public.worker_qr_codes(qr_token) WHERE is_revoked = false AND deleted_at IS NULL;
CREATE INDEX idx_worker_qr_codes_worker_project ON public.worker_qr_codes(worker_id, project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_gate_passes_date_status ON public.material_gate_passes(pass_date, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_gate_passes_project ON public.material_gate_passes(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contractor_audit_logs_entity ON public.contractor_module_audit_logs(entity_type, entity_id);
CREATE INDEX idx_contractor_audit_logs_tenant_created ON public.contractor_module_audit_logs(tenant_id, created_at DESC);

-- =====================================================
-- PART 8: UPDATED_AT TRIGGERS
-- =====================================================
CREATE TRIGGER update_contractor_companies_updated_at
BEFORE UPDATE ON public.contractor_companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contractor_representatives_updated_at
BEFORE UPDATE ON public.contractor_representatives
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contractor_projects_updated_at
BEFORE UPDATE ON public.contractor_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_safety_officers_updated_at
BEFORE UPDATE ON public.project_safety_officers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contractor_workers_updated_at
BEFORE UPDATE ON public.contractor_workers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_worker_assignments_updated_at
BEFORE UPDATE ON public.project_worker_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_induction_videos_updated_at
BEFORE UPDATE ON public.induction_videos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worker_inductions_updated_at
BEFORE UPDATE ON public.worker_inductions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worker_qr_codes_updated_at
BEFORE UPDATE ON public.worker_qr_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_gate_passes_updated_at
BEFORE UPDATE ON public.material_gate_passes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();