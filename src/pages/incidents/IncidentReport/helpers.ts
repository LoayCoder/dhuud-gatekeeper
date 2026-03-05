export const OBSERVATION_TYPES = [
  { value: 'unsafe_act', labelKey: 'incidents.observationTypes.unsafeAct', isPositive: false },
  { value: 'unsafe_condition', labelKey: 'incidents.observationTypes.unsafeCondition', isPositive: false },
  { value: 'safe_act', labelKey: 'incidents.observationTypes.safeAct', isPositive: true },
  { value: 'safe_condition', labelKey: 'incidents.observationTypes.safeCondition', isPositive: true },
];

// Removed - now using HSSE_SEVERITY_LEVELS from src/lib/hsse-severity-levels.ts

export const RISK_RATING_LEVELS = [
  { value: 'low', labelKey: 'incidents.riskRating.low', color: 'bg-success' },
  { value: 'medium', labelKey: 'incidents.riskRating.medium', color: 'bg-warning' },
  { value: 'high', labelKey: 'incidents.riskRating.high', color: 'bg-destructive' },
];

export const WIZARD_STEPS = [
  { id: 1, labelKey: 'incidents.wizard.stepCapture' },
  { id: 2, labelKey: 'incidents.wizard.stepLocation' },
  { id: 3, labelKey: 'incidents.wizard.stepDetails' },
];
