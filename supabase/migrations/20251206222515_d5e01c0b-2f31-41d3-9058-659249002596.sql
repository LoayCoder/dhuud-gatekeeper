-- Create incident_asset_links junction table for multiple assets per incident
CREATE TABLE public.incident_asset_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.hsse_assets(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'involved' CHECK (link_type IN ('involved', 'damaged', 'caused_by', 'affected')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(incident_id, asset_id)
);

-- Create indexes for performance
CREATE INDEX idx_incident_asset_links_tenant ON public.incident_asset_links(tenant_id);
CREATE INDEX idx_incident_asset_links_incident ON public.incident_asset_links(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_asset_links_asset ON public.incident_asset_links(asset_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.incident_asset_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view asset links in their tenant"
ON public.incident_asset_links FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create asset links"
ON public.incident_asset_links FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id() AND has_hsse_incident_access(auth.uid()));

CREATE POLICY "HSSE users can update asset links"
ON public.incident_asset_links FOR UPDATE
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_hsse_incident_access(auth.uid()));

CREATE POLICY "HSSE users can delete asset links"
ON public.incident_asset_links FOR DELETE
USING (tenant_id = get_auth_tenant_id() AND has_hsse_incident_access(auth.uid()));