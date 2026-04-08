
-- =============================================
-- Add site clearance fields to project_mobilizations
-- =============================================
ALTER TABLE public.project_mobilizations
  ADD COLUMN utility_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN underground_utilities_identified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN high_risk_zones_marked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN work_boundaries_defined BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN known_risks TEXT,
  ADD COLUMN control_measures TEXT,
  ADD COLUMN validity_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN clearance_expires_at TIMESTAMPTZ,
  ADD COLUMN clearance_notes TEXT;

-- =============================================
-- Discipline Sign-Off table
-- =============================================
CREATE TABLE public.site_clearance_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  mobilization_id UUID NOT NULL REFERENCES project_mobilizations(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  signed_by UUID REFERENCES profiles(id),
  signed_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(mobilization_id, discipline, deleted_at)
);

-- Validation trigger for discipline values
CREATE OR REPLACE FUNCTION public.validate_signoff_discipline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.discipline NOT IN ('electrical', 'mechanical', 'irrigation_water', 'underground_civil', 'it_communication', 'area_owner', 'hsse') THEN
    RAISE EXCEPTION 'Invalid discipline: %', NEW.discipline;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_signoff_discipline
  BEFORE INSERT OR UPDATE ON public.site_clearance_signoffs
  FOR EACH ROW EXECUTE FUNCTION public.validate_signoff_discipline();

CREATE INDEX idx_site_clearance_signoffs_mob ON public.site_clearance_signoffs(mobilization_id);
CREATE INDEX idx_site_clearance_signoffs_tenant ON public.site_clearance_signoffs(tenant_id);

ALTER TABLE public.site_clearance_signoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for site_clearance_signoffs"
  ON public.site_clearance_signoffs
  FOR ALL TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE TRIGGER update_site_clearance_signoffs_updated_at
  BEFORE UPDATE ON public.site_clearance_signoffs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Site Clearance Attachments table
-- =============================================
CREATE TABLE public.site_clearance_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  mobilization_id UUID NOT NULL REFERENCES project_mobilizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_site_clearance_attachments_mob ON public.site_clearance_attachments(mobilization_id);
CREATE INDEX idx_site_clearance_attachments_tenant ON public.site_clearance_attachments(tenant_id);

ALTER TABLE public.site_clearance_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for site_clearance_attachments"
  ON public.site_clearance_attachments
  FOR ALL TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- =============================================
-- Site Clearance Audit Logs table
-- =============================================
CREATE TABLE public.site_clearance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  mobilization_id UUID NOT NULL REFERENCES project_mobilizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  discipline TEXT,
  actor_id UUID NOT NULL REFERENCES profiles(id),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for action values
CREATE OR REPLACE FUNCTION public.validate_clearance_audit_action()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action NOT IN ('sign_off', 'revoke', 'approve', 'reject', 'upload', 'delete', 'update_risk', 'update_verification') THEN
    RAISE EXCEPTION 'Invalid clearance audit action: %', NEW.action;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_clearance_audit_action
  BEFORE INSERT OR UPDATE ON public.site_clearance_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_clearance_audit_action();

CREATE INDEX idx_site_clearance_audit_mob ON public.site_clearance_audit_logs(mobilization_id);
CREATE INDEX idx_site_clearance_audit_tenant ON public.site_clearance_audit_logs(tenant_id);

ALTER TABLE public.site_clearance_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for site_clearance_audit_logs"
  ON public.site_clearance_audit_logs
  FOR ALL TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- =============================================
-- Storage bucket for clearance attachments
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-clearance-attachments', 'site-clearance-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tenant users can upload clearance attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-clearance-attachments');

CREATE POLICY "Tenant users can view clearance attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'site-clearance-attachments');

CREATE POLICY "Tenant users can delete clearance attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-clearance-attachments');
