// Property Damage Constants for HSSA Investigation System
// Contains type definitions and localization for property damage records

export type PropertyTypeCode = 'equipment' | 'vehicle' | 'structure' | 'infrastructure' | 'material' | 'other';
export type DamageSeverityCode = 'minor' | 'moderate' | 'major' | 'total_loss';
export type OperationalImpactCode = 'none' | 'minimal' | 'moderate' | 'significant' | 'critical';
export type RepairStatusCode = 'pending' | 'in_progress' | 'completed' | 'not_repairable';

interface LabelWithColors {
  en: string;
  ar: string;
  color: string;
  icon?: string;
}

interface Label {
  en: string;
  ar: string;
  icon?: string;
}

export const PROPERTY_TYPES: Record<PropertyTypeCode, Label> = {
  equipment: { en: 'Equipment', ar: 'معدات', icon: 'Wrench' },
  vehicle: { en: 'Vehicle', ar: 'مركبة', icon: 'Car' },
  structure: { en: 'Structure', ar: 'مبنى', icon: 'Building' },
  infrastructure: { en: 'Infrastructure', ar: 'بنية تحتية', icon: 'Network' },
  material: { en: 'Material', ar: 'مواد', icon: 'Package' },
  other: { en: 'Other', ar: 'أخرى', icon: 'MoreHorizontal' },
};

export const DAMAGE_SEVERITY: Record<DamageSeverityCode, LabelWithColors> = {
  minor: { 
    en: 'Minor', 
    ar: 'طفيف', 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' 
  },
  moderate: { 
    en: 'Moderate', 
    ar: 'متوسط', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' 
  },
  major: { 
    en: 'Major', 
    ar: 'كبير', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
  },
  total_loss: { 
    en: 'Total Loss', 
    ar: 'خسارة كلية', 
    color: 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200' 
  },
};

export const OPERATIONAL_IMPACT: Record<OperationalImpactCode, LabelWithColors> = {
  none: { 
    en: 'None', 
    ar: 'لا يوجد', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
  },
  minimal: { 
    en: 'Minimal', 
    ar: 'ضئيل', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
  },
  moderate: { 
    en: 'Moderate', 
    ar: 'متوسط', 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' 
  },
  significant: { 
    en: 'Significant', 
    ar: 'كبير', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' 
  },
  critical: { 
    en: 'Critical', 
    ar: 'حرج', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
  },
};

export const REPAIR_STATUS: Record<RepairStatusCode, LabelWithColors> = {
  pending: { 
    en: 'Pending', 
    ar: 'قيد الانتظار', 
    color: 'bg-muted text-muted-foreground' 
  },
  in_progress: { 
    en: 'In Progress', 
    ar: 'جاري الإصلاح', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
  },
  completed: { 
    en: 'Completed', 
    ar: 'مكتمل', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
  },
  not_repairable: { 
    en: 'Not Repairable', 
    ar: 'غير قابل للإصلاح', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
  },
};

// Utility function to get localized label
export function getPropertyTypeLabel(code: PropertyTypeCode, isRTL: boolean): string {
  return isRTL ? PROPERTY_TYPES[code].ar : PROPERTY_TYPES[code].en;
}

export function getDamageSeverityLabel(code: DamageSeverityCode, isRTL: boolean): string {
  return isRTL ? DAMAGE_SEVERITY[code].ar : DAMAGE_SEVERITY[code].en;
}

export function getOperationalImpactLabel(code: OperationalImpactCode, isRTL: boolean): string {
  return isRTL ? OPERATIONAL_IMPACT[code].ar : OPERATIONAL_IMPACT[code].en;
}

export function getRepairStatusLabel(code: RepairStatusCode, isRTL: boolean): string {
  return isRTL ? REPAIR_STATUS[code].ar : REPAIR_STATUS[code].en;
}
