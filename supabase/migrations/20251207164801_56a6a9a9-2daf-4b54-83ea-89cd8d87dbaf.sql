-- Create area_inspection_findings table
CREATE TABLE public.area_inspection_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  session_id UUID NOT NULL REFERENCES public.inspection_sessions(id) ON DELETE CASCADE,
  response_id UUID NOT NULL REFERENCES public.area_inspection_responses(id) ON DELETE CASCADE,
  reference_id TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'observation',
  risk_level TEXT DEFAULT 'medium',
  description TEXT,
  recommendation TEXT,
  corrective_action_id UUID REFERENCES public.corrective_actions(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_area_findings_tenant ON public.area_inspection_findings(tenant_id);
CREATE INDEX idx_area_findings_session ON public.area_inspection_findings(session_id);
CREATE INDEX idx_area_findings_response ON public.area_inspection_findings(response_id);
CREATE INDEX idx_area_findings_status ON public.area_inspection_findings(status) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.area_inspection_findings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view findings in their tenant"
ON public.area_inspection_findings FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create findings"
ON public.area_inspection_findings FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "HSSE users can update findings"
ON public.area_inspection_findings FOR UPDATE
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_asset_management_access(auth.uid()));

CREATE POLICY "Admins can delete findings"
ON public.area_inspection_findings FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- Reference ID generation function
CREATE OR REPLACE FUNCTION public.generate_finding_reference_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  FROM area_inspection_findings
  WHERE tenant_id = NEW.tenant_id
    AND reference_id LIKE 'FND-' || year_suffix || '-%';
  
  NEW.reference_id := 'FND-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$$;

-- Create trigger for reference ID
CREATE TRIGGER generate_finding_ref_id
BEFORE INSERT ON public.area_inspection_findings
FOR EACH ROW
EXECUTE FUNCTION public.generate_finding_reference_id();