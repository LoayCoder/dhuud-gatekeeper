-- =====================================================
-- HSSE Event Category Management System
-- =====================================================

-- Create enum for category codes if needed
CREATE TYPE hsse_category_code AS ENUM (
  'safety', 'health', 'process_safety', 'environment', 'security',
  'property_asset_damage', 'road_traffic_vehicle', 'quality_service',
  'community_third_party', 'compliance_regulatory', 'emergency_crisis'
);

-- =====================================================
-- 1. Master Event Categories Table (System-level)
-- =====================================================
CREATE TABLE public.hsse_event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_key TEXT NOT NULL,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. Master Event Subtypes Table (System-level)
-- =====================================================
CREATE TABLE public.hsse_event_subtypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.hsse_event_categories(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  name_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. Tenant Category Overrides Table
-- =====================================================
CREATE TABLE public.tenant_event_category_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.hsse_event_categories(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, category_id)
);

-- =====================================================
-- 4. Tenant Subtype Overrides Table
-- =====================================================
CREATE TABLE public.tenant_event_subtype_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subtype_id UUID NOT NULL REFERENCES public.hsse_event_subtypes(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, subtype_id)
);

-- =====================================================
-- 5. Enable RLS on all tables
-- =====================================================
ALTER TABLE public.hsse_event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsse_event_subtypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_event_category_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_event_subtype_overrides ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS Policies for master tables (read-only for all authenticated)
-- =====================================================
CREATE POLICY "Anyone can read event categories"
ON public.hsse_event_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can read event subtypes"
ON public.hsse_event_subtypes FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 7. RLS Policies for tenant override tables
-- =====================================================
-- Get tenant_id from user's profile
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Category overrides policies
CREATE POLICY "Users can read their tenant category overrides"
ON public.tenant_event_category_overrides FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage their tenant category overrides"
ON public.tenant_event_category_overrides FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'));

-- Subtype overrides policies
CREATE POLICY "Users can read their tenant subtype overrides"
ON public.tenant_event_subtype_overrides FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage their tenant subtype overrides"
ON public.tenant_event_subtype_overrides FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 8. Seed Event Categories
-- =====================================================
INSERT INTO public.hsse_event_categories (code, name_key, sort_order) VALUES
('safety', 'incidents.hsseEventTypes.safety', 1),
('health', 'incidents.hsseEventTypes.health', 2),
('process_safety', 'incidents.hsseEventTypes.processSafety', 3),
('environment', 'incidents.hsseEventTypes.environment', 4),
('security', 'incidents.hsseEventTypes.security', 5),
('property_asset_damage', 'incidents.hsseEventTypes.propertyAssetDamage', 6),
('road_traffic_vehicle', 'incidents.hsseEventTypes.roadTrafficVehicle', 7),
('quality_service', 'incidents.hsseEventTypes.qualityService', 8),
('community_third_party', 'incidents.hsseEventTypes.communityThirdParty', 9),
('compliance_regulatory', 'incidents.hsseEventTypes.complianceRegulatory', 10),
('emergency_crisis', 'incidents.hsseEventTypes.emergencyCrisis', 11);

-- =====================================================
-- 9. Seed Event Subtypes
-- =====================================================
-- Safety subtypes
INSERT INTO public.hsse_event_subtypes (category_id, code, name_key, sort_order)
SELECT c.id, s.code, s.name_key, s.sort_order
FROM public.hsse_event_categories c,
(VALUES 
  ('slip_trip_fall_same_level', 'incidents.hsseSubtypes.safety.slipTripFallSameLevel', 1),
  ('fall_from_height', 'incidents.hsseSubtypes.safety.fallFromHeight', 2),
  ('struck_by_hit_by', 'incidents.hsseSubtypes.safety.struckByHitBy', 3),
  ('caught_in_caught_between', 'incidents.hsseSubtypes.safety.caughtInCaughtBetween', 4),
  ('manual_handling_overexertion', 'incidents.hsseSubtypes.safety.manualHandlingOverexertion', 5),
  ('cut_laceration', 'incidents.hsseSubtypes.safety.cutLaceration', 6),
  ('eye_injury', 'incidents.hsseSubtypes.safety.eyeInjury', 7),
  ('burn_non_chemical', 'incidents.hsseSubtypes.safety.burnNonChemical', 8),
  ('electrical_shock', 'incidents.hsseSubtypes.safety.electricalShock', 9),
  ('dropped_object_injury', 'incidents.hsseSubtypes.safety.droppedObjectInjury', 10),
  ('confined_space_injury', 'incidents.hsseSubtypes.safety.confinedSpaceInjury', 11),
  ('tool_equipment_injury', 'incidents.hsseSubtypes.safety.toolEquipmentInjury', 12)
) AS s(code, name_key, sort_order)
WHERE c.code = 'safety';

-- Health subtypes
INSERT INTO public.hsse_event_subtypes (category_id, code, name_key, sort_order)
SELECT c.id, s.code, s.name_key, s.sort_order
FROM public.hsse_event_categories c,
(VALUES 
  ('heat_stress_dehydration', 'incidents.hsseSubtypes.health.heatStressDehydration', 1),
  ('chemical_exposure', 'incidents.hsseSubtypes.health.chemicalExposure', 2),
  ('noise_exposure', 'incidents.hsseSubtypes.health.noiseExposure', 3),
  ('respiratory_irritation', 'incidents.hsseSubtypes.health.respiratoryIrritation', 4),
  ('fatigue_fitness_for_duty', 'incidents.hsseSubtypes.health.fatigueFitnessForDuty', 5),
  ('occupational_disease', 'incidents.hsseSubtypes.health.occupationalDisease', 6),
  ('foodborne_illness', 'incidents.hsseSubtypes.health.foodborneIllness', 7)
) AS s(code, name_key, sort_order)
WHERE c.code = 'health';

-- Process Safety subtypes
INSERT INTO public.hsse_event_subtypes (category_id, code, name_key, sort_order)
SELECT c.id, s.code, s.name_key, s.sort_order
FROM public.hsse_event_categories c,
(VALUES 
  ('lopc', 'incidents.hsseSubtypes.processSafety.lopc', 1),
  ('process_fire', 'incidents.hsseSubtypes.processSafety.processFire', 2),
  ('process_explosion', 'incidents.hsseSubtypes.processSafety.processExplosion', 3),
  ('overpressure_relief_event', 'incidents.hsseSubtypes.processSafety.overpressureReliefEvent', 4),
  ('dangerous_substance_release', 'incidents.hsseSubtypes.processSafety.dangerousSubstanceRelease', 5),
  ('process_upset_runaway', 'incidents.hsseSubtypes.processSafety.processUpsetRunaway', 6),
  ('critical_barrier_failure', 'incidents.hsseSubtypes.processSafety.criticalBarrierFailure', 7)
) AS s(code, name_key, sort_order)
WHERE c.code = 'process_safety';

-- Environment subtypes
INSERT INTO public.hsse_event_subtypes (category_id, code, name_key, sort_order)
SELECT c.id, s.code, s.name_key, s.sort_order
FROM public.hsse_event_categories c,
(VALUES 
  ('oil_chemical_spill_land', 'incidents.hsseSubtypes.environment.oilChemicalSpillLand', 1),
  ('spill_to_water', 'incidents.hsseSubtypes.environment.spillToWater', 2),
  ('air_emission', 'incidents.hsseSubtypes.environment.airEmission', 3),
  ('waste_mismanagement', 'incidents.hsseSubtypes.environment.wasteMismanagement', 4),
  ('soil_contamination', 'incidents.hsseSubtypes.environment.soilContamination', 5),
  ('wildlife_impact', 'incidents.hsseSubtypes.environment.wildlifeImpact', 6),
  ('non_compliant_discharge', 'incidents.hsseSubtypes.environment.nonCompliantDischarge', 7)
) AS s(code, name_key, sort_order)
WHERE c.code = 'environment';

-- Security subtypes
INSERT INTO public.hsse_event_subtypes (category_id, code, name_key, sort_order)
SELECT c.id, s.code, s.name_key, s.sort_order
FROM public.hsse_event_categories c,
(VALUES 
  ('unauthorized_access', 'incidents.hsseSubtypes.security.unauthorizedAccess', 1),
  ('theft_loss', 'incidents.hsseSubtypes.security.theftLoss', 2),
  ('vandalism', 'incidents.hsseSubtypes.security.vandalism', 3),
  ('assault_threat', 'incidents.hsseSubtypes.security.assaultThreat', 4),
  ('crowd_control_incident', 'incidents.hsseSubtypes.security.crowdControlIncident', 5),
  ('suspicious_package', 'incidents.hsseSubtypes.security.suspiciousPackage', 6),
  ('perimeter_breach', 'incidents.hsseSubtypes.security.perimeterBreach', 7),
  ('information_security', 'incidents.hsseSubtypes.security.informationSecurity', 8)
) AS s(code, name_key, sort_order)
WHERE c.code = 'security';

-- Property & Asset Damage subtypes
INSERT INTO public.hsse_event_subtypes (category_id, code, name_key, sort_order)
SELECT c.id, s.code, s.name_key, s.sort_order
FROM public.hsse_event_categories c,
(VALUES 
  ('equipment_damage', 'incidents.hsseSubtypes.propertyAssetDamage.equipmentDamage', 1),
  ('building_infrastructure_damage', 'incidents.hsseSubtypes.propertyAssetDamage.buildingInfrastructureDamage', 2),
  ('utility_outage', 'incidents.hsseSubtypes.propertyAssetDamage.utilityOutage', 3),
  ('non_process_fire', 'incidents.hsseSubtypes.propertyAssetDamage.nonProcessFire', 4),
  ('flooding_weather_damage', 'incidents.hsseSubtypes.propertyAssetDamage.floodingWeatherDamage', 5)
) AS s(code, name_key, sort_order)
WHERE c.code = 'property_asset_damage';

-- Road Traffic / Vehicle subtypes
INSERT INTO public.hsse_event_subtypes (category_id, code, name_key, sort_order)
SELECT c.id, s.code, s.name_key, s.sort_order
FROM public.hsse_event_categories c,
(VALUES 
  ('vehicle_collision', 'incidents.hsseSubtypes.roadTrafficVehicle.vehicleCollision', 1),
  ('pedestrian_struck', 'incidents.hsseSubtypes.roadTrafficVehicle.pedestrianStruck', 2),
  ('reversing_incident', 'incidents.hsseSubtypes.roadTrafficVehicle.reversingIncident', 3),
  ('forklift_buggy_incident', 'incidents.hsseSubtypes.roadTrafficVehicle.forkliftBuggyIncident', 4),
  ('speeding_unsafe_driving', 'incidents.hsseSubtypes.roadTrafficVehicle.speedingUnsafeDriving', 5),
  ('vehicle_fire', 'incidents.hsseSubtypes.roadTrafficVehicle.vehicleFire', 6),
  ('load_shift_securing_failure', 'incidents.hsseSubtypes.roadTrafficVehicle.loadShiftSecuringFailure', 7)
) AS s(code, name_key, sort_order)
WHERE c.code = 'road_traffic_vehicle';

-- Quality / Service subtypes
INSERT INTO public.hsse_event_subtypes (category_id, code, name_key, sort_order)
SELECT c.id, s.code, s.name_key, s.sort_order
FROM public.hsse_event_categories c,
(VALUES 
  ('service_interruption', 'incidents.hsseSubtypes.qualityService.serviceInterruption', 1),
  ('product_nonconformance', 'incidents.hsseSubtypes.qualityService.productNonconformance', 2),
  ('critical_equipment_failure', 'incidents.hsseSubtypes.qualityService.criticalEquipmentFailure', 3)
) AS s(code, name_key, sort_order)
WHERE c.code = 'quality_service';

-- Community / Third-Party subtypes
INSERT INTO public.hsse_event_subtypes (category_id, code, name_key, sort_order)
SELECT c.id, s.code, s.name_key, s.sort_order
FROM public.hsse_event_categories c,
(VALUES 
  ('visitor_injury', 'incidents.hsseSubtypes.communityThirdParty.visitorInjury', 1),
  ('third_party_property_damage', 'incidents.hsseSubtypes.communityThirdParty.thirdPartyPropertyDamage', 2),
  ('public_complaint', 'incidents.hsseSubtypes.communityThirdParty.publicComplaint', 3),
  ('offsite_traffic_impact', 'incidents.hsseSubtypes.communityThirdParty.offsiteTrafficImpact', 4)
) AS s(code, name_key, sort_order)
WHERE c.code = 'community_third_party';

-- Compliance / Regulatory subtypes
INSERT INTO public.hsse_event_subtypes (category_id, code, name_key, sort_order)
SELECT c.id, s.code, s.name_key, s.sort_order
FROM public.hsse_event_categories c,
(VALUES 
  ('ptw_violation', 'incidents.hsseSubtypes.complianceRegulatory.ptwViolation', 1),
  ('fire_system_breach', 'incidents.hsseSubtypes.complianceRegulatory.fireSystemBreach', 2),
  ('contractor_compliance_breach', 'incidents.hsseSubtypes.complianceRegulatory.contractorComplianceBreach', 3),
  ('environmental_permit_breach', 'incidents.hsseSubtypes.complianceRegulatory.environmentalPermitBreach', 4),
  ('security_sop_breach', 'incidents.hsseSubtypes.complianceRegulatory.securitySopBreach', 5),
  ('legal_reporting_breach', 'incidents.hsseSubtypes.complianceRegulatory.legalReportingBreach', 6)
) AS s(code, name_key, sort_order)
WHERE c.code = 'compliance_regulatory';

-- Emergency / Crisis subtypes
INSERT INTO public.hsse_event_subtypes (category_id, code, name_key, sort_order)
SELECT c.id, s.code, s.name_key, s.sort_order
FROM public.hsse_event_categories c,
(VALUES 
  ('erp_medical', 'incidents.hsseSubtypes.emergencyCrisis.erpMedical', 1),
  ('erp_fire', 'incidents.hsseSubtypes.emergencyCrisis.erpFire', 2),
  ('erp_security', 'incidents.hsseSubtypes.emergencyCrisis.erpSecurity', 3),
  ('erp_environmental', 'incidents.hsseSubtypes.emergencyCrisis.erpEnvironmental', 4),
  ('erp_weather_other', 'incidents.hsseSubtypes.emergencyCrisis.erpWeatherOther', 5)
) AS s(code, name_key, sort_order)
WHERE c.code = 'emergency_crisis';

-- =====================================================
-- 10. Helper Functions for Active Categories/Subtypes
-- =====================================================

-- Get active categories for a tenant (considering overrides)
CREATE OR REPLACE FUNCTION public.get_active_event_categories(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name_key TEXT,
  icon TEXT,
  sort_order INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.code,
    c.name_key,
    c.icon,
    c.sort_order
  FROM public.hsse_event_categories c
  LEFT JOIN public.tenant_event_category_overrides o 
    ON o.category_id = c.id AND o.tenant_id = p_tenant_id
  WHERE c.is_active = true 
    AND COALESCE(o.is_active, true) = true
  ORDER BY c.sort_order;
$$;

-- Get active subtypes for a category and tenant
CREATE OR REPLACE FUNCTION public.get_active_event_subtypes(p_tenant_id UUID, p_category_code TEXT)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name_key TEXT,
  sort_order INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.code,
    s.name_key,
    s.sort_order
  FROM public.hsse_event_subtypes s
  JOIN public.hsse_event_categories c ON c.id = s.category_id
  LEFT JOIN public.tenant_event_subtype_overrides o 
    ON o.subtype_id = s.id AND o.tenant_id = p_tenant_id
  WHERE c.code = p_category_code
    AND s.is_active = true 
    AND COALESCE(o.is_active, true) = true
  ORDER BY s.sort_order;
$$;

-- Toggle category active status for a tenant
CREATE OR REPLACE FUNCTION public.toggle_event_category(
  p_tenant_id UUID,
  p_category_id UUID,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_event_category_overrides (tenant_id, category_id, is_active)
  VALUES (p_tenant_id, p_category_id, p_is_active)
  ON CONFLICT (tenant_id, category_id) 
  DO UPDATE SET is_active = p_is_active, updated_at = now();
END;
$$;

-- Toggle subtype active status for a tenant
CREATE OR REPLACE FUNCTION public.toggle_event_subtype(
  p_tenant_id UUID,
  p_subtype_id UUID,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_event_subtype_overrides (tenant_id, subtype_id, is_active)
  VALUES (p_tenant_id, p_subtype_id, p_is_active)
  ON CONFLICT (tenant_id, subtype_id) 
  DO UPDATE SET is_active = p_is_active, updated_at = now();
END;
$$;

-- =====================================================
-- 11. Update timestamps trigger
-- =====================================================
CREATE TRIGGER update_hsse_event_categories_updated_at
  BEFORE UPDATE ON public.hsse_event_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hsse_event_subtypes_updated_at
  BEFORE UPDATE ON public.hsse_event_subtypes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_event_category_overrides_updated_at
  BEFORE UPDATE ON public.tenant_event_category_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_event_subtype_overrides_updated_at
  BEFORE UPDATE ON public.tenant_event_subtype_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 12. Indexes for performance
-- =====================================================
CREATE INDEX idx_hsse_event_subtypes_category ON public.hsse_event_subtypes(category_id);
CREATE INDEX idx_tenant_category_overrides_tenant ON public.tenant_event_category_overrides(tenant_id);
CREATE INDEX idx_tenant_subtype_overrides_tenant ON public.tenant_event_subtype_overrides(tenant_id);