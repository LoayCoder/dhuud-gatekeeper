-- Environmental Contamination Entries Table
CREATE TABLE public.environmental_contamination_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  
  -- Section A: Contamination Type & Source
  contamination_types TEXT[] DEFAULT '{}',
  contaminant_name TEXT NOT NULL,
  contaminant_type TEXT,
  hazard_classification TEXT,
  release_source TEXT CHECK (release_source IN ('tank', 'pipe', 'vehicle', 'equipment', 'storage_area', 'other')),
  release_source_description TEXT,
  release_cause TEXT CHECK (release_cause IN ('equipment_failure', 'human_error', 'corrosion', 'overfilling', 'unknown', 'other')),
  release_cause_justification TEXT,
  
  -- Section B: Quantity & Spread
  volume_released DECIMAL(12,3),
  volume_unit TEXT DEFAULT 'liters' CHECK (volume_unit IN ('liters', 'm3', 'gallons', 'barrels')),
  weight_released DECIMAL(12,3),
  weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'tons')),
  area_affected_sqm DECIMAL(12,2),
  depth_cm DECIMAL(8,2),
  exposure_duration_minutes INTEGER,
  contaminated_volume_m3 DECIMAL(12,3),
  spill_severity TEXT CHECK (spill_severity IN ('low', 'medium', 'high')),
  
  -- Section C: Secondary Containment
  secondary_containment_exists BOOLEAN DEFAULT false,
  containment_design_capacity DECIMAL(12,2),
  containment_capacity_unit TEXT DEFAULT 'liters',
  containment_retained_volume DECIMAL(12,2),
  containment_failure_reason TEXT CHECK (containment_failure_reason IN ('structural_damage', 'overflow', 'poor_maintenance', 'design_deficiency', 'other')),
  containment_failure_reason_other TEXT,
  containment_failure_percentage DECIMAL(5,2),
  regulatory_breach_flagged BOOLEAN DEFAULT false,
  
  -- Section D: Environmental & Population Impact
  impacted_receptors TEXT[] DEFAULT '{}',
  recovery_potential TEXT CHECK (recovery_potential IN ('natural_recovery', 'requires_remediation', 'long_term_monitoring')),
  population_exposed BOOLEAN DEFAULT false,
  population_affected_count INTEGER,
  exposure_type TEXT CHECK (exposure_type IN ('direct_contact', 'inhalation', 'indirect_food_water')),
  population_proximity TEXT CHECK (population_proximity IN ('onsite_workers', 'public_area', 'residential_zone')),
  
  -- Section E: Cost Estimation
  soil_remediation_cost DECIMAL(12,2),
  waste_disposal_cost DECIMAL(12,2),
  testing_analysis_cost DECIMAL(12,2),
  cleanup_contractor_cost DECIMAL(12,2),
  regulatory_fines DECIMAL(12,2),
  cost_currency TEXT DEFAULT 'SAR',
  total_environmental_cost DECIMAL(12,2),
  cost_severity TEXT CHECK (cost_severity IN ('minor', 'major', 'severe')),
  
  -- Section F: Regulatory & Compliance
  applicable_regulation TEXT CHECK (applicable_regulation IN ('local', 'national', 'international', 'multiple')),
  regulatory_notification_required BOOLEAN DEFAULT false,
  authority_notified TEXT[] DEFAULT '{}',
  notification_date TIMESTAMPTZ,
  notification_reference TEXT,
  
  -- Metadata
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_environmental_contamination_incident ON public.environmental_contamination_entries(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_environmental_contamination_tenant ON public.environmental_contamination_entries(tenant_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.environmental_contamination_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant isolation for environmental_contamination_entries"
ON public.environmental_contamination_entries
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Trigger function for auto-calculations
CREATE OR REPLACE FUNCTION calculate_environmental_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate contaminated volume (for soil: area × depth)
  IF NEW.area_affected_sqm IS NOT NULL AND NEW.depth_cm IS NOT NULL THEN
    NEW.contaminated_volume_m3 := NEW.area_affected_sqm * (NEW.depth_cm / 100);
  END IF;
  
  -- Calculate containment failure percentage
  IF NEW.volume_released IS NOT NULL AND NEW.volume_released > 0 THEN
    NEW.containment_failure_percentage := 
      ((NEW.volume_released - COALESCE(NEW.containment_retained_volume, 0)) / NEW.volume_released) * 100;
  END IF;
  
  -- Flag regulatory breach if containment capacity exceeded
  IF NEW.secondary_containment_exists = true 
     AND NEW.containment_design_capacity IS NOT NULL 
     AND NEW.volume_released IS NOT NULL 
     AND NEW.volume_released > NEW.containment_design_capacity THEN
    NEW.regulatory_breach_flagged := true;
  ELSE
    NEW.regulatory_breach_flagged := false;
  END IF;
  
  -- Calculate total environmental cost
  NEW.total_environmental_cost := COALESCE(NEW.soil_remediation_cost, 0) 
    + COALESCE(NEW.waste_disposal_cost, 0)
    + COALESCE(NEW.testing_analysis_cost, 0)
    + COALESCE(NEW.cleanup_contractor_cost, 0)
    + COALESCE(NEW.regulatory_fines, 0);
  
  -- Determine cost severity
  IF NEW.total_environmental_cost >= 500000 THEN
    NEW.cost_severity := 'severe';
  ELSIF NEW.total_environmental_cost >= 100000 THEN
    NEW.cost_severity := 'major';
  ELSIF NEW.total_environmental_cost > 0 THEN
    NEW.cost_severity := 'minor';
  ELSE
    NEW.cost_severity := NULL;
  END IF;
  
  -- Determine spill severity based on volume and hazard
  IF NEW.volume_released >= 1000 OR NEW.hazard_classification IN ('toxic', 'carcinogen') THEN
    NEW.spill_severity := 'high';
  ELSIF NEW.volume_released >= 100 OR NEW.hazard_classification IN ('flammable', 'corrosive') THEN
    NEW.spill_severity := 'medium';
  ELSIF NEW.volume_released > 0 THEN
    NEW.spill_severity := 'low';
  ELSE
    NEW.spill_severity := NULL;
  END IF;
  
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER environmental_contamination_calculations
  BEFORE INSERT OR UPDATE ON public.environmental_contamination_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_environmental_metrics();

-- Updated_at trigger
CREATE TRIGGER update_environmental_contamination_updated_at
  BEFORE UPDATE ON public.environmental_contamination_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();