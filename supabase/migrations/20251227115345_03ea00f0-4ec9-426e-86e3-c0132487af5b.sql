-- Add warranty columns to hsse_assets
ALTER TABLE public.hsse_assets
ADD COLUMN IF NOT EXISTS warranty_provider TEXT,
ADD COLUMN IF NOT EXISTS warranty_terms TEXT;

-- Create asset_warranty_claims table
CREATE TABLE public.asset_warranty_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.hsse_assets(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_description TEXT NOT NULL,
  claim_status TEXT NOT NULL DEFAULT 'submitted' CHECK (claim_status IN ('submitted', 'under_review', 'approved', 'rejected', 'completed')),
  vendor_name TEXT,
  vendor_contact TEXT,
  repair_cost DECIMAL(12,2),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.asset_warranty_claims ENABLE ROW LEVEL SECURITY;

-- RLS policies for asset_warranty_claims
CREATE POLICY "Users can view warranty claims in their tenant"
ON public.asset_warranty_claims
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
  AND deleted_at IS NULL
);

CREATE POLICY "Users can create warranty claims in their tenant"
ON public.asset_warranty_claims
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update warranty claims in their tenant"
ON public.asset_warranty_claims
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
  AND deleted_at IS NULL
);

-- Create indexes
CREATE INDEX idx_warranty_claims_tenant ON public.asset_warranty_claims(tenant_id);
CREATE INDEX idx_warranty_claims_asset ON public.asset_warranty_claims(asset_id);
CREATE INDEX idx_warranty_claims_status ON public.asset_warranty_claims(claim_status);
CREATE INDEX idx_warranty_claims_deleted ON public.asset_warranty_claims(deleted_at) WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_warranty_claims_updated_at
BEFORE UPDATE ON public.asset_warranty_claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();