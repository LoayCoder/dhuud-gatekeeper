/**
 * HSSE Event Type Hierarchy
 * 11 Top-Level Event Types (for incidents) with conditional subcategories
 */

// Event Type (Top-Level Category) - Incident Only
export const HSSE_EVENT_TYPES = [
  { value: 'safety', labelKey: 'incidents.hsseEventTypes.safety' },
  { value: 'health', labelKey: 'incidents.hsseEventTypes.health' },
  { value: 'process_safety', labelKey: 'incidents.hsseEventTypes.processSafety' },
  { value: 'environment', labelKey: 'incidents.hsseEventTypes.environment' },
  { value: 'security', labelKey: 'incidents.hsseEventTypes.security' },
  { value: 'property_asset_damage', labelKey: 'incidents.hsseEventTypes.propertyAssetDamage' },
  { value: 'road_traffic_vehicle', labelKey: 'incidents.hsseEventTypes.roadTrafficVehicle' },
  { value: 'quality_service', labelKey: 'incidents.hsseEventTypes.qualityService' },
  { value: 'community_third_party', labelKey: 'incidents.hsseEventTypes.communityThirdParty' },
  { value: 'compliance_regulatory', labelKey: 'incidents.hsseEventTypes.complianceRegulatory' },
  { value: 'emergency_crisis', labelKey: 'incidents.hsseEventTypes.emergencyCrisis' },
] as const;

// Incident Subtypes by Event Type
export const HSSE_SUBTYPES: Record<string, { value: string; labelKey: string }[]> = {
  // A) Safety (Occupational Injury / Harm)
  safety: [
    { value: 'slip_trip_fall_same_level', labelKey: 'incidents.hsseSubtypes.safety.slipTripFallSameLevel' },
    { value: 'fall_from_height', labelKey: 'incidents.hsseSubtypes.safety.fallFromHeight' },
    { value: 'struck_by_hit_by', labelKey: 'incidents.hsseSubtypes.safety.struckByHitBy' },
    { value: 'caught_in_caught_between', labelKey: 'incidents.hsseSubtypes.safety.caughtInCaughtBetween' },
    { value: 'manual_handling_overexertion', labelKey: 'incidents.hsseSubtypes.safety.manualHandlingOverexertion' },
    { value: 'cut_laceration', labelKey: 'incidents.hsseSubtypes.safety.cutLaceration' },
    { value: 'eye_injury', labelKey: 'incidents.hsseSubtypes.safety.eyeInjury' },
    { value: 'burn_non_chemical', labelKey: 'incidents.hsseSubtypes.safety.burnNonChemical' },
    { value: 'electrical_shock', labelKey: 'incidents.hsseSubtypes.safety.electricalShock' },
    { value: 'dropped_object_injury', labelKey: 'incidents.hsseSubtypes.safety.droppedObjectInjury' },
    { value: 'confined_space_injury', labelKey: 'incidents.hsseSubtypes.safety.confinedSpaceInjury' },
    { value: 'tool_equipment_injury', labelKey: 'incidents.hsseSubtypes.safety.toolEquipmentInjury' },
  ],
  
  // B) Health (Illness / Exposure)
  health: [
    { value: 'heat_stress_dehydration', labelKey: 'incidents.hsseSubtypes.health.heatStressDehydration' },
    { value: 'chemical_exposure', labelKey: 'incidents.hsseSubtypes.health.chemicalExposure' },
    { value: 'noise_exposure', labelKey: 'incidents.hsseSubtypes.health.noiseExposure' },
    { value: 'respiratory_irritation', labelKey: 'incidents.hsseSubtypes.health.respiratoryIrritation' },
    { value: 'fatigue_fitness_for_duty', labelKey: 'incidents.hsseSubtypes.health.fatigueFitnessForDuty' },
    { value: 'occupational_disease', labelKey: 'incidents.hsseSubtypes.health.occupationalDisease' },
    { value: 'foodborne_illness', labelKey: 'incidents.hsseSubtypes.health.foodborneIllness' },
  ],
  
  // C) Process Safety (PSE-aligned)
  process_safety: [
    { value: 'lopc', labelKey: 'incidents.hsseSubtypes.processSafety.lopc' },
    { value: 'process_fire', labelKey: 'incidents.hsseSubtypes.processSafety.processFire' },
    { value: 'process_explosion', labelKey: 'incidents.hsseSubtypes.processSafety.processExplosion' },
    { value: 'overpressure_relief_event', labelKey: 'incidents.hsseSubtypes.processSafety.overpressureReliefEvent' },
    { value: 'dangerous_substance_release', labelKey: 'incidents.hsseSubtypes.processSafety.dangerousSubstanceRelease' },
    { value: 'process_upset_runaway', labelKey: 'incidents.hsseSubtypes.processSafety.processUpsetRunaway' },
    { value: 'critical_barrier_failure', labelKey: 'incidents.hsseSubtypes.processSafety.criticalBarrierFailure' },
  ],
  
  // D) Environment
  environment: [
    { value: 'oil_chemical_spill_land', labelKey: 'incidents.hsseSubtypes.environment.oilChemicalSpillLand' },
    { value: 'spill_to_water', labelKey: 'incidents.hsseSubtypes.environment.spillToWater' },
    { value: 'air_emission', labelKey: 'incidents.hsseSubtypes.environment.airEmission' },
    { value: 'waste_mismanagement', labelKey: 'incidents.hsseSubtypes.environment.wasteMismanagement' },
    { value: 'soil_contamination', labelKey: 'incidents.hsseSubtypes.environment.soilContamination' },
    { value: 'wildlife_impact', labelKey: 'incidents.hsseSubtypes.environment.wildlifeImpact' },
    { value: 'non_compliant_discharge', labelKey: 'incidents.hsseSubtypes.environment.nonCompliantDischarge' },
  ],
  
  // E) Security
  security: [
    { value: 'unauthorized_access', labelKey: 'incidents.hsseSubtypes.security.unauthorizedAccess' },
    { value: 'theft_loss', labelKey: 'incidents.hsseSubtypes.security.theftLoss' },
    { value: 'vandalism', labelKey: 'incidents.hsseSubtypes.security.vandalism' },
    { value: 'assault_threat', labelKey: 'incidents.hsseSubtypes.security.assaultThreat' },
    { value: 'crowd_control_incident', labelKey: 'incidents.hsseSubtypes.security.crowdControlIncident' },
    { value: 'suspicious_package', labelKey: 'incidents.hsseSubtypes.security.suspiciousPackage' },
    { value: 'perimeter_breach', labelKey: 'incidents.hsseSubtypes.security.perimeterBreach' },
    { value: 'information_security', labelKey: 'incidents.hsseSubtypes.security.informationSecurity' },
  ],
  
  // F) Property & Asset Damage (Non-process)
  property_asset_damage: [
    { value: 'equipment_damage', labelKey: 'incidents.hsseSubtypes.propertyAssetDamage.equipmentDamage' },
    { value: 'building_infrastructure_damage', labelKey: 'incidents.hsseSubtypes.propertyAssetDamage.buildingInfrastructureDamage' },
    { value: 'utility_outage', labelKey: 'incidents.hsseSubtypes.propertyAssetDamage.utilityOutage' },
    { value: 'non_process_fire', labelKey: 'incidents.hsseSubtypes.propertyAssetDamage.nonProcessFire' },
    { value: 'flooding_weather_damage', labelKey: 'incidents.hsseSubtypes.propertyAssetDamage.floodingWeatherDamage' },
  ],
  
  // G) Road Traffic / Vehicle & Mobile Equipment
  road_traffic_vehicle: [
    { value: 'vehicle_collision', labelKey: 'incidents.hsseSubtypes.roadTrafficVehicle.vehicleCollision' },
    { value: 'pedestrian_struck', labelKey: 'incidents.hsseSubtypes.roadTrafficVehicle.pedestrianStruck' },
    { value: 'reversing_incident', labelKey: 'incidents.hsseSubtypes.roadTrafficVehicle.reversingIncident' },
    { value: 'forklift_buggy_incident', labelKey: 'incidents.hsseSubtypes.roadTrafficVehicle.forkliftBuggyIncident' },
    { value: 'speeding_unsafe_driving', labelKey: 'incidents.hsseSubtypes.roadTrafficVehicle.speedingUnsafeDriving' },
    { value: 'vehicle_fire', labelKey: 'incidents.hsseSubtypes.roadTrafficVehicle.vehicleFire' },
    { value: 'load_shift_securing_failure', labelKey: 'incidents.hsseSubtypes.roadTrafficVehicle.loadShiftSecuringFailure' },
  ],
  
  // H) Quality / Service Impact (optional)
  quality_service: [
    { value: 'service_interruption', labelKey: 'incidents.hsseSubtypes.qualityService.serviceInterruption' },
    { value: 'product_nonconformance', labelKey: 'incidents.hsseSubtypes.qualityService.productNonconformance' },
    { value: 'critical_equipment_failure', labelKey: 'incidents.hsseSubtypes.qualityService.criticalEquipmentFailure' },
  ],
  
  // I) Community / Third-Party Impact
  community_third_party: [
    { value: 'visitor_injury', labelKey: 'incidents.hsseSubtypes.communityThirdParty.visitorInjury' },
    { value: 'third_party_property_damage', labelKey: 'incidents.hsseSubtypes.communityThirdParty.thirdPartyPropertyDamage' },
    { value: 'public_complaint', labelKey: 'incidents.hsseSubtypes.communityThirdParty.publicComplaint' },
    { value: 'offsite_traffic_impact', labelKey: 'incidents.hsseSubtypes.communityThirdParty.offsiteTrafficImpact' },
  ],
  
  // J) Compliance / Regulatory Breach
  compliance_regulatory: [
    { value: 'ptw_violation', labelKey: 'incidents.hsseSubtypes.complianceRegulatory.ptwViolation' },
    { value: 'fire_system_breach', labelKey: 'incidents.hsseSubtypes.complianceRegulatory.fireSystemBreach' },
    { value: 'contractor_compliance_breach', labelKey: 'incidents.hsseSubtypes.complianceRegulatory.contractorComplianceBreach' },
    { value: 'environmental_permit_breach', labelKey: 'incidents.hsseSubtypes.complianceRegulatory.environmentalPermitBreach' },
    { value: 'security_sop_breach', labelKey: 'incidents.hsseSubtypes.complianceRegulatory.securitySopBreach' },
    { value: 'legal_reporting_breach', labelKey: 'incidents.hsseSubtypes.complianceRegulatory.legalReportingBreach' },
  ],
  
  // K) Emergency / Crisis Activation
  emergency_crisis: [
    { value: 'erp_medical', labelKey: 'incidents.hsseSubtypes.emergencyCrisis.erpMedical' },
    { value: 'erp_fire', labelKey: 'incidents.hsseSubtypes.emergencyCrisis.erpFire' },
    { value: 'erp_security', labelKey: 'incidents.hsseSubtypes.emergencyCrisis.erpSecurity' },
    { value: 'erp_environmental', labelKey: 'incidents.hsseSubtypes.emergencyCrisis.erpEnvironmental' },
    { value: 'erp_weather_other', labelKey: 'incidents.hsseSubtypes.emergencyCrisis.erpWeatherOther' },
  ],
};

// Helper function to get subtypes for a given event type
export function getSubtypesForEventType(eventType: string): { value: string; labelKey: string }[] {
  return HSSE_SUBTYPES[eventType] || [];
}

// All subtype values for validation/AI
export const ALL_HSSE_SUBTYPE_VALUES = Object.values(HSSE_SUBTYPES).flat().map(s => s.value);

// Map event type value to display key for analytics/dashboard
export const EVENT_TYPE_DISPLAY_MAP: Record<string, string> = {
  safety: 'Safety',
  health: 'Health',
  process_safety: 'Process Safety',
  environment: 'Environment',
  security: 'Security',
  property_asset_damage: 'Property & Asset Damage',
  road_traffic_vehicle: 'Road Traffic / Vehicle',
  quality_service: 'Quality / Service',
  community_third_party: 'Community / Third-Party',
  compliance_regulatory: 'Compliance / Regulatory',
  emergency_crisis: 'Emergency / Crisis',
};

// Keywords for AI fallback classification
export const HSSE_EVENT_TYPE_KEYWORDS: Record<string, string[]> = {
  safety: ['injury', 'injured', 'hurt', 'fall', 'slip', 'trip', 'cut', 'laceration', 'struck', 'hit', 'caught', 'burn', 'electric shock', 'dropped object', 'confined space', 'tool', 'equipment injury'],
  health: ['heat stress', 'dehydration', 'chemical exposure', 'inhalation', 'noise', 'hearing', 'respiratory', 'dust', 'fumes', 'fatigue', 'illness', 'disease', 'food poisoning'],
  process_safety: ['lopc', 'containment', 'leak', 'process fire', 'explosion', 'overpressure', 'relief valve', 'toxic release', 'flammable', 'process upset', 'runaway', 'barrier failure', 'sis', 'psv', 'esd'],
  environment: ['spill', 'oil spill', 'chemical spill', 'stormwater', 'sewer', 'emission', 'odor', 'dust release', 'waste', 'disposal', 'contamination', 'wildlife', 'discharge'],
  security: ['unauthorized', 'breach', 'theft', 'stolen', 'vandalism', 'assault', 'threat', 'harassment', 'crowd', 'bomb threat', 'suspicious', 'perimeter', 'information security', 'cyber'],
  property_asset_damage: ['equipment damage', 'building damage', 'infrastructure', 'utility outage', 'power outage', 'water outage', 'non-process fire', 'flooding', 'weather damage', 'storm damage'],
  road_traffic_vehicle: ['vehicle', 'collision', 'crash', 'pedestrian struck', 'reversing', 'forklift', 'buggy', 'cart', 'speeding', 'unsafe driving', 'vehicle fire', 'load shift'],
  quality_service: ['service interruption', 'outage', 'nonconformance', 'quality failure', 'equipment failure'],
  community_third_party: ['visitor injury', 'third party', 'public complaint', 'noise complaint', 'dust complaint', 'odor complaint', 'offsite', 'traffic impact'],
  compliance_regulatory: ['ptw violation', 'permit violation', 'fire system', 'contractor breach', 'environmental permit', 'security sop', 'legal breach', 'reporting breach', 'compliance'],
  emergency_crisis: ['erp', 'emergency response', 'evacuation', 'crisis', 'activated', 'emergency medical', 'emergency fire'],
};
