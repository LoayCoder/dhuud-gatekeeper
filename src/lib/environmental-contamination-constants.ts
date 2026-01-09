// Environmental Contamination Constants with EN/AR translations

export interface ConstantOption {
  en: string;
  ar: string;
  color?: string;
  icon?: string;
}

export const CONTAMINATION_TYPES: Record<string, ConstantOption> = {
  soil: { en: 'Soil', ar: 'تربة', icon: 'Mountain' },
  surface_water: { en: 'Surface Water', ar: 'مياه سطحية', icon: 'Waves' },
  groundwater: { en: 'Groundwater', ar: 'مياه جوفية', icon: 'Droplets' },
  air: { en: 'Air', ar: 'هواء', icon: 'Wind' },
  secondary_containment: { en: 'Secondary Containment Failure', ar: 'فشل الاحتواء الثانوي', icon: 'Container' },
};

export const RELEASE_SOURCES: Record<string, ConstantOption> = {
  tank: { en: 'Tank', ar: 'خزان' },
  pipe: { en: 'Pipe', ar: 'أنبوب' },
  vehicle: { en: 'Vehicle', ar: 'مركبة' },
  equipment: { en: 'Equipment', ar: 'معدات' },
  storage_area: { en: 'Storage Area', ar: 'منطقة تخزين' },
  other: { en: 'Other', ar: 'أخرى' },
};

export const RELEASE_CAUSES: Record<string, ConstantOption> = {
  equipment_failure: { en: 'Equipment Failure', ar: 'فشل المعدات' },
  human_error: { en: 'Human Error', ar: 'خطأ بشري' },
  corrosion: { en: 'Corrosion', ar: 'تآكل' },
  overfilling: { en: 'Overfilling', ar: 'فيضان' },
  unknown: { en: 'Unknown', ar: 'غير معروف' },
  other: { en: 'Other', ar: 'أخرى' },
};

export const HAZARD_CLASSIFICATIONS: Record<string, ConstantOption> = {
  flammable: { en: 'Flammable', ar: 'قابل للاشتعال', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  toxic: { en: 'Toxic', ar: 'سام', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  corrosive: { en: 'Corrosive', ar: 'مسبب للتآكل', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  oxidizer: { en: 'Oxidizer', ar: 'مؤكسد', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  irritant: { en: 'Irritant', ar: 'مهيج', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  carcinogen: { en: 'Carcinogen', ar: 'مسرطن', color: 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200' },
  environmental_hazard: { en: 'Environmental Hazard', ar: 'خطر بيئي', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
};

export const SPILL_SEVERITY: Record<string, ConstantOption> = {
  low: { en: 'Low', ar: 'منخفض', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  medium: { en: 'Medium', ar: 'متوسط', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  high: { en: 'High', ar: 'مرتفع', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

export const COST_SEVERITY: Record<string, ConstantOption> = {
  minor: { en: 'Minor', ar: 'طفيف', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  major: { en: 'Major', ar: 'كبير', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  severe: { en: 'Severe', ar: 'شديد', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

export const CONTAINMENT_FAILURE_REASONS: Record<string, ConstantOption> = {
  structural_damage: { en: 'Structural Damage', ar: 'ضرر هيكلي' },
  overflow: { en: 'Overflow', ar: 'فيضان' },
  poor_maintenance: { en: 'Poor Maintenance', ar: 'صيانة سيئة' },
  design_deficiency: { en: 'Design Deficiency', ar: 'قصور في التصميم' },
  other: { en: 'Other', ar: 'أخرى' },
};

export const IMPACTED_RECEPTORS: Record<string, ConstantOption> = {
  soil: { en: 'Soil', ar: 'تربة' },
  vegetation: { en: 'Vegetation', ar: 'نباتات' },
  wildlife: { en: 'Wildlife', ar: 'حياة برية' },
  water_bodies: { en: 'Water Bodies', ar: 'مسطحات مائية' },
};

export const RECOVERY_POTENTIAL: Record<string, ConstantOption> = {
  natural_recovery: { en: 'Natural Recovery', ar: 'استعادة طبيعية' },
  requires_remediation: { en: 'Requires Remediation', ar: 'يتطلب معالجة' },
  long_term_monitoring: { en: 'Long-term Monitoring Required', ar: 'يتطلب مراقبة طويلة المدى' },
};

export const EXPOSURE_TYPES: Record<string, ConstantOption> = {
  direct_contact: { en: 'Direct Contact', ar: 'اتصال مباشر' },
  inhalation: { en: 'Inhalation', ar: 'استنشاق' },
  indirect_food_water: { en: 'Indirect (Food/Water)', ar: 'غير مباشر (غذاء/ماء)' },
};

export const POPULATION_PROXIMITY: Record<string, ConstantOption> = {
  onsite_workers: { en: 'Onsite Workers', ar: 'عمال الموقع' },
  public_area: { en: 'Public Area', ar: 'منطقة عامة' },
  residential_zone: { en: 'Residential Zone', ar: 'منطقة سكنية' },
};

export const APPLICABLE_REGULATIONS: Record<string, ConstantOption> = {
  local: { en: 'Local', ar: 'محلي' },
  national: { en: 'National', ar: 'وطني' },
  international: { en: 'International', ar: 'دولي' },
  multiple: { en: 'Multiple', ar: 'متعدد' },
};

export const AUTHORITIES: Record<string, ConstantOption> = {
  environmental_authority: { en: 'Environmental Authority', ar: 'الهيئة البيئية' },
  municipality: { en: 'Municipality', ar: 'البلدية' },
  civil_defense: { en: 'Civil Defense', ar: 'الدفاع المدني' },
};

export const VOLUME_UNITS: Record<string, ConstantOption> = {
  liters: { en: 'Liters', ar: 'لتر' },
  m3: { en: 'Cubic Meters (m³)', ar: 'متر مكعب' },
  gallons: { en: 'Gallons', ar: 'جالون' },
  barrels: { en: 'Barrels', ar: 'برميل' },
};

export const WEIGHT_UNITS: Record<string, ConstantOption> = {
  kg: { en: 'Kilograms (kg)', ar: 'كيلوغرام' },
  tons: { en: 'Tons', ar: 'طن' },
};

// Helper function to get label based on language
export function getConstantLabel(
  constants: Record<string, ConstantOption>,
  key: string | null | undefined,
  isRTL: boolean
): string {
  if (!key || !constants[key]) return '-';
  return isRTL ? constants[key].ar : constants[key].en;
}

// Helper function to get multiple labels for arrays
export function getConstantLabels(
  constants: Record<string, ConstantOption>,
  keys: string[] | null | undefined,
  isRTL: boolean
): string[] {
  if (!keys || keys.length === 0) return [];
  return keys.map(key => getConstantLabel(constants, key, isRTL)).filter(label => label !== '-');
}

// Type definition for Environmental Contamination Entry
export interface EnvironmentalContaminationEntry {
  id: string;
  tenant_id: string;
  incident_id: string;
  contamination_types: string[];
  contaminant_name: string;
  contaminant_type: string | null;
  hazard_classification: string | null;
  release_source: string | null;
  release_source_description: string | null;
  release_cause: string | null;
  release_cause_justification: string | null;
  volume_released: number | null;
  volume_unit: string | null;
  weight_released: number | null;
  weight_unit: string | null;
  area_affected_sqm: number | null;
  depth_cm: number | null;
  exposure_duration_minutes: number | null;
  contaminated_volume_m3: number | null;
  spill_severity: string | null;
  secondary_containment_exists: boolean;
  containment_design_capacity: number | null;
  containment_capacity_unit: string | null;
  containment_retained_volume: number | null;
  containment_failure_reason: string | null;
  containment_failure_reason_other: string | null;
  containment_failure_percentage: number | null;
  regulatory_breach_flagged: boolean;
  impacted_receptors: string[];
  recovery_potential: string | null;
  population_exposed: boolean;
  population_affected_count: number | null;
  exposure_type: string | null;
  population_proximity: string | null;
  soil_remediation_cost: number | null;
  waste_disposal_cost: number | null;
  testing_analysis_cost: number | null;
  cleanup_contractor_cost: number | null;
  regulatory_fines: number | null;
  cost_currency: string | null;
  total_environmental_cost: number | null;
  cost_severity: string | null;
  applicable_regulation: string | null;
  regulatory_notification_required: boolean;
  authority_notified: string[];
  notification_date: string | null;
  notification_reference: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type EnvironmentalContaminationFormData = Omit<
  EnvironmentalContaminationEntry,
  'id' | 'tenant_id' | 'incident_id' | 'contaminated_volume_m3' | 'containment_failure_percentage' | 
  'total_environmental_cost' | 'cost_severity' | 'spill_severity' | 'regulatory_breach_flagged' |
  'recorded_by' | 'created_at' | 'updated_at' | 'deleted_at'
>;
