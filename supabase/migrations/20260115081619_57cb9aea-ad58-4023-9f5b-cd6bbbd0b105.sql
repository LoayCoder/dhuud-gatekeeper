-- Create asset_type_parts table
-- Stores inspectable parts/components for each asset type
CREATE TABLE public.asset_type_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES public.asset_types(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  is_critical BOOLEAN DEFAULT false,
  default_response_type TEXT DEFAULT 'pass_fail' CHECK (default_response_type IN ('pass_fail', 'condition_rating', 'numeric')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  branch_id UUID REFERENCES public.branches(id),
  UNIQUE(tenant_id, type_id, code, deleted_at)
);

-- Create asset_inspection_part_results table
-- Stores inspection results for each part during an asset inspection
CREATE TABLE public.asset_inspection_part_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.asset_inspections(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.asset_type_parts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'na')),
  condition_rating INTEGER CHECK (condition_rating >= 1 AND condition_rating <= 5),
  notes TEXT,
  photo_path TEXT,
  responded_by UUID REFERENCES public.profiles(id),
  responded_at TIMESTAMPTZ DEFAULT now(),
  branch_id UUID REFERENCES public.branches(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE(inspection_id, part_id)
);

-- Enable RLS on both tables
ALTER TABLE public.asset_type_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_inspection_part_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for asset_type_parts
CREATE POLICY "Users can view parts for their tenant" 
ON public.asset_type_parts FOR SELECT 
USING (tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid);

CREATE POLICY "Users can insert parts for their tenant" 
ON public.asset_type_parts FOR INSERT 
WITH CHECK (tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid);

CREATE POLICY "Users can update parts for their tenant" 
ON public.asset_type_parts FOR UPDATE 
USING (tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid);

CREATE POLICY "Users can delete parts for their tenant" 
ON public.asset_type_parts FOR DELETE 
USING (tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid);

-- RLS policies for asset_inspection_part_results
CREATE POLICY "Users can view part results for their tenant" 
ON public.asset_inspection_part_results FOR SELECT 
USING (tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid);

CREATE POLICY "Users can insert part results for their tenant" 
ON public.asset_inspection_part_results FOR INSERT 
WITH CHECK (tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid);

CREATE POLICY "Users can update part results for their tenant" 
ON public.asset_inspection_part_results FOR UPDATE 
USING (tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid);

CREATE POLICY "Users can delete part results for their tenant" 
ON public.asset_inspection_part_results FOR DELETE 
USING (tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid);

-- Create indexes for performance
CREATE INDEX idx_asset_type_parts_type_id ON public.asset_type_parts(type_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_asset_type_parts_tenant_id ON public.asset_type_parts(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_asset_inspection_part_results_inspection_id ON public.asset_inspection_part_results(inspection_id);
CREATE INDEX idx_asset_inspection_part_results_part_id ON public.asset_inspection_part_results(part_id);

-- Trigger for updating updated_at timestamp
CREATE TRIGGER update_asset_type_parts_updated_at
  BEFORE UPDATE ON public.asset_type_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();