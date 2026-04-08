
-- Add notes columns to project_mobilizations
ALTER TABLE public.project_mobilizations
  ADD COLUMN IF NOT EXISTS utility_verified_notes TEXT,
  ADD COLUMN IF NOT EXISTS underground_utilities_notes TEXT,
  ADD COLUMN IF NOT EXISTS high_risk_zones_notes TEXT,
  ADD COLUMN IF NOT EXISTS work_boundaries_notes TEXT;

-- Create site_clearance_risks table
CREATE TABLE public.site_clearance_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  mobilization_id UUID NOT NULL REFERENCES public.project_mobilizations(id) ON DELETE CASCADE,
  risk_description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  control_measures TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Validation trigger for severity
CREATE OR REPLACE FUNCTION public.validate_risk_severity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity value: %', NEW.severity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_risk_severity
  BEFORE INSERT OR UPDATE ON public.site_clearance_risks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_risk_severity();

-- Updated_at trigger
CREATE TRIGGER update_site_clearance_risks_updated_at
  BEFORE UPDATE ON public.site_clearance_risks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.site_clearance_risks ENABLE ROW LEVEL SECURITY;

-- RLS policies using get_auth_tenant_id()
CREATE POLICY "Tenant isolation for site_clearance_risks"
  ON public.site_clearance_risks
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Tenant members can create risks"
  ON public.site_clearance_risks
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant members can update risks"
  ON public.site_clearance_risks
  FOR UPDATE
  TO authenticated
  USING (tenant_id = get_auth_tenant_id());

-- Index for faster lookups
CREATE INDEX idx_site_clearance_risks_mobilization ON public.site_clearance_risks(mobilization_id) WHERE deleted_at IS NULL;
