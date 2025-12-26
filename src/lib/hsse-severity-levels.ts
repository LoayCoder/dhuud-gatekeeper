/**
 * HSSE 5-Level Severity Rating System (Unified Risk Matrix)
 * 
 * Rule: Choose the highest credible impact across 
 * People / Environment / Asset / Business / Reputation-Security.
 * 
 * Validation Rules (audit-proof):
 * - If ERP activated → severity cannot be less than Level 4
 * - If fatality/permanent impairment → must be Level 5
 * - If LTI/LWDC → must be at least Level 4
 * 
 * Observation Workflow Logic:
 * - Levels 1-2 (Low): Allow "Close on Spot" with photo/note
 * - Levels 3-4 (Serious/Major): HSSE Review required, auto-close when actions verified
 * - Level 5 (Catastrophic): HSSE Manager approval required for closure
 */

export type SeverityLevelV2 = 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5';
export type HSSEValidationStatus = 'pending' | 'accepted' | 'rejected';

export interface SeverityLevelConfig {
  value: SeverityLevelV2;
  labelKey: string;
  descriptionKey: string;
  examplesKey: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  // Workflow behavior flags
  allowCloseOnSpot: boolean;
  requiresHSSEReview: boolean;
  requiresManagerClosure: boolean;
  blockedUntilVerified: boolean;
}

export const HSSE_SEVERITY_LEVELS: SeverityLevelConfig[] = [
  {
    value: 'level_1',
    labelKey: 'severity.level1.label',
    descriptionKey: 'severity.level1.description',
    examplesKey: 'severity.level1.examples',
    color: 'hsl(160 84% 39%)', // Emerald-500
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-500',
    badgeVariant: 'outline',
    // Workflow: Allow Close on Spot
    allowCloseOnSpot: true,
    requiresHSSEReview: false,
    requiresManagerClosure: false,
    blockedUntilVerified: false,
  },
  {
    value: 'level_2',
    labelKey: 'severity.level2.label',
    descriptionKey: 'severity.level2.description',
    examplesKey: 'severity.level2.examples',
    color: 'hsl(48 96% 53%)', // Yellow-500
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-500',
    badgeVariant: 'secondary',
    // Workflow: Allow Close on Spot
    allowCloseOnSpot: true,
    requiresHSSEReview: false,
    requiresManagerClosure: false,
    blockedUntilVerified: false,
  },
  {
    value: 'level_3',
    labelKey: 'severity.level3.label',
    descriptionKey: 'severity.level3.description',
    examplesKey: 'severity.level3.examples',
    color: 'hsl(25 95% 53%)', // Orange-500
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-500',
    badgeVariant: 'secondary',
    // Workflow: Requires HSSE Review
    allowCloseOnSpot: false,
    requiresHSSEReview: true,
    requiresManagerClosure: false,
    blockedUntilVerified: false,
  },
  {
    value: 'level_4',
    labelKey: 'severity.level4.label',
    descriptionKey: 'severity.level4.description',
    examplesKey: 'severity.level4.examples',
    color: 'hsl(0 72% 51%)', // Red-600
    bgColor: 'bg-red-600',
    textColor: 'text-red-700',
    borderColor: 'border-red-600',
    badgeVariant: 'destructive',
    // Workflow: HSSE Review + Blocked until verified
    allowCloseOnSpot: false,
    requiresHSSEReview: true,
    requiresManagerClosure: false,
    blockedUntilVerified: true,
  },
  {
    value: 'level_5',
    labelKey: 'severity.level5.label',
    descriptionKey: 'severity.level5.description',
    examplesKey: 'severity.level5.examples',
    color: 'hsl(0 62% 30%)', // Red-900
    bgColor: 'bg-red-900',
    textColor: 'text-red-900',
    borderColor: 'border-red-900',
    badgeVariant: 'destructive',
    // Workflow: Manager Closure Only
    allowCloseOnSpot: false,
    requiresHSSEReview: true,
    requiresManagerClosure: true,
    blockedUntilVerified: true,
  },
];

// Injury classifications that trigger validation rules
export const SEVERITY_VALIDATION_TRIGGERS = {
  // Must be Level 5
  fatalityRequired: ['fatality', 'permanent_disability'],
  // Minimum Level 4
  ltiMinimum: ['lost_time_injury', 'lost_time', 'lwdc'],
} as const;

// ERP-related event types that trigger Level 4 minimum
export const ERP_EVENT_TYPES = ['emergency_crisis'] as const;

/**
 * Calculate the minimum required severity based on incident data
 */
export function calculateMinimumSeverity(
  injuryClassification: string | null | undefined,
  erpActivated: boolean | null | undefined,
  eventType: string | null | undefined
): { minLevel: SeverityLevelV2; reason: string | null } {
  // Rule 1: Fatality or permanent disability → Level 5
  if (injuryClassification && SEVERITY_VALIDATION_TRIGGERS.fatalityRequired.includes(injuryClassification as any)) {
    return {
      minLevel: 'level_5',
      reason: 'validation.fatalityRequired',
    };
  }

  // Rule 2: LTI/LWDC → minimum Level 4
  if (injuryClassification && SEVERITY_VALIDATION_TRIGGERS.ltiMinimum.includes(injuryClassification as any)) {
    return {
      minLevel: 'level_4',
      reason: 'validation.ltiMinimum',
    };
  }

  // Rule 3: ERP activated → minimum Level 4
  if (erpActivated || (eventType && ERP_EVENT_TYPES.includes(eventType as any))) {
    return {
      minLevel: 'level_4',
      reason: 'validation.erpMinimum',
    };
  }

  return { minLevel: 'level_1', reason: null };
}

/**
 * Check if the selected severity is below the required minimum
 */
export function isSeverityBelowMinimum(
  selectedSeverity: SeverityLevelV2 | null | undefined,
  minSeverity: SeverityLevelV2
): boolean {
  if (!selectedSeverity) return false;
  
  const levelOrder: SeverityLevelV2[] = ['level_1', 'level_2', 'level_3', 'level_4', 'level_5'];
  const selectedIndex = levelOrder.indexOf(selectedSeverity);
  const minIndex = levelOrder.indexOf(minSeverity);
  
  return selectedIndex < minIndex;
}

/**
 * Get severity level config by value
 */
export function getSeverityConfig(severity: SeverityLevelV2 | null | undefined): SeverityLevelConfig | null {
  if (!severity) return null;
  return HSSE_SEVERITY_LEVELS.find(level => level.value === severity) || null;
}

/**
 * Get badge variant for severity level
 */
export function getSeverityBadgeVariant(severity: SeverityLevelV2 | string | null | undefined): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!severity) return 'outline';
  
  // Handle old severity values for backward compatibility
  const oldToNewMap: Record<string, SeverityLevelV2> = {
    'low': 'level_1',
    'medium': 'level_2',
    'high': 'level_3',
    'critical': 'level_4',
  };
  
  const normalizedSeverity = oldToNewMap[severity] || severity as SeverityLevelV2;
  const config = getSeverityConfig(normalizedSeverity);
  return config?.badgeVariant || 'outline';
}

/**
 * Map old severity values to new 5-level system
 */
export function mapOldSeverityToNew(oldSeverity: string | null | undefined): SeverityLevelV2 | null {
  if (!oldSeverity) return null;
  
  const mapping: Record<string, SeverityLevelV2> = {
    'low': 'level_1',
    'medium': 'level_2',
    'high': 'level_3',
    'critical': 'level_4',
  };
  
  return mapping[oldSeverity] || null;
}

/**
 * Get severity level number (1-5) from level value
 */
export function getSeverityLevelNumber(severity: SeverityLevelV2 | null | undefined): number {
  if (!severity) return 0;
  return parseInt(severity.replace('level_', ''), 10);
}

/**
 * Check if observation can be closed on spot based on severity
 * Levels 1-2 allow close on spot
 */
export function canCloseOnSpot(severity: SeverityLevelV2 | null | undefined): boolean {
  if (!severity) return false;
  const config = getSeverityConfig(severity);
  return config?.allowCloseOnSpot ?? false;
}

/**
 * Check if severity level requires HSSE review
 * Levels 3+ require HSSE Expert validation
 */
export function requiresHSSEReview(severity: SeverityLevelV2 | null | undefined): boolean {
  if (!severity) return false;
  const config = getSeverityConfig(severity);
  return config?.requiresHSSEReview ?? false;
}

/**
 * Check if severity level requires HSSE Manager closure
 * Level 5 (Catastrophic) requires manager approval to close
 */
export function requiresManagerClosure(severity: SeverityLevelV2 | null | undefined): boolean {
  if (!severity) return false;
  const config = getSeverityConfig(severity);
  return config?.requiresManagerClosure ?? false;
}

/**
 * Check if closure is blocked until actions/residual risk verified
 * Levels 4-5 are blocked until verification complete
 */
export function isClosureBlocked(severity: SeverityLevelV2 | null | undefined): boolean {
  if (!severity) return false;
  const config = getSeverityConfig(severity);
  return config?.blockedUntilVerified ?? false;
}

/**
 * Map old risk_rating (low/medium/high) to new severity scale
 * Used for unifying observations with incidents
 */
export function mapRiskRatingToSeverity(riskRating: string | null | undefined): SeverityLevelV2 | null {
  if (!riskRating) return null;
  
  const mapping: Record<string, SeverityLevelV2> = {
    'low': 'level_1',
    'medium': 'level_2',
    'high': 'level_3',
  };
  
  return mapping[riskRating] || null;
}

/**
 * Get workflow behavior description for UI display
 */
export function getWorkflowBehavior(severity: SeverityLevelV2 | null | undefined): {
  canCloseOnSpot: boolean;
  requiresHSSEReview: boolean;
  requiresManagerClosure: boolean;
  workflowKey: string;
} {
  const config = getSeverityConfig(severity);
  
  if (!config) {
    return {
      canCloseOnSpot: false,
      requiresHSSEReview: false,
      requiresManagerClosure: false,
      workflowKey: 'workflow.unknown',
    };
  }
  
  let workflowKey = 'workflow.standard';
  
  if (config.requiresManagerClosure) {
    workflowKey = 'workflow.managerClosureRequired';
  } else if (config.requiresHSSEReview) {
    workflowKey = 'workflow.hsseReviewRequired';
  } else if (config.allowCloseOnSpot) {
    workflowKey = 'workflow.closeOnSpotAllowed';
  }
  
  return {
    canCloseOnSpot: config.allowCloseOnSpot,
    requiresHSSEReview: config.requiresHSSEReview,
    requiresManagerClosure: config.requiresManagerClosure,
    workflowKey,
  };
}
