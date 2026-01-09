-- Create incident_property_damages table for tracking property damage in investigations
CREATE TABLE public.incident_property_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  
  -- Property identification
  property_name TEXT NOT NULL,
  property_type TEXT CHECK (property_type IN ('equipment', 'vehicle', 'structure', 'infrastructure', 'material', 'other')),
  asset_tag TEXT,
  location_description TEXT,
  
  -- Damage details
  damage_date TIMESTAMPTZ,
  damage_description TEXT,
  damage_severity TEXT CHECK (damage_severity IN ('minor', 'moderate', 'major', 'total_loss')),
  
  -- Cost estimation
  repair_cost_estimate DECIMAL(12,2),
  replacement_cost_estimate DECIMAL(12,2),
  cost_currency TEXT DEFAULT 'SAR',
  cost_assessment_by TEXT,
  cost_assessment_date TIMESTAMPTZ,
  
  -- Impact assessment
  operational_impact TEXT CHECK (operational_impact IN ('none', 'minimal', 'moderate', 'significant', 'critical')),
  downtime_hours INTEGER DEFAULT 0,
  safety_hazard_created BOOLEAN DEFAULT false,
  safety_hazard_description TEXT,
  
  -- Resolution tracking
  repair_status TEXT CHECK (repair_status IN ('pending', 'in_progress', 'completed', 'not_repairable')) DEFAULT 'pending',
  repair_completed_date TIMESTAMPTZ,
  actual_repair_cost DECIMAL(12,2),
  
  -- Data entry tracking
  recorded_by UUID REFERENCES public.profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_incident_property_damages_incident_id ON public.incident_property_damages(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_property_damages_tenant_id ON public.incident_property_damages(tenant_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.incident_property_damages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation for select
CREATE POLICY "Users can view property damages in their tenant"
ON public.incident_property_damages
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Tenant isolation for insert
CREATE POLICY "Users can create property damages in their tenant"
ON public.incident_property_damages
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Tenant isolation for update
CREATE POLICY "Users can update property damages in their tenant"
ON public.incident_property_damages
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Tenant isolation for delete (soft delete)
CREATE POLICY "Users can delete property damages in their tenant"
ON public.incident_property_damages
FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_incident_property_damages_updated_at
  BEFORE UPDATE ON public.incident_property_damages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();