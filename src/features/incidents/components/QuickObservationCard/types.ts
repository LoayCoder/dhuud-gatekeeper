import { z } from 'zod';
import { type SeverityLevelV2 } from '@/lib/hsse-severity-levels';

export const OBSERVATION_TYPES = [
  { value: 'unsafe_act', labelKey: 'incidents.observationTypes.unsafeAct', isPositive: false },
  { value: 'unsafe_condition', labelKey: 'incidents.observationTypes.unsafeCondition', isPositive: false },
  { value: 'safe_act', labelKey: 'incidents.observationTypes.safeAct', isPositive: true },
  { value: 'safe_condition', labelKey: 'incidents.observationTypes.safeCondition', isPositive: true },
];

export const SEVERITY_OPTIONS = HSSE_SEVERITY_LEVELS.map(level => ({
  value: level.value,
  color: `${level.bgColor} hover:opacity-90`,
  textColor: level.bgColor.replace('bg-', 'text-'),
}));

export const RECOGNITION_TYPES = [
  { value: 'individual', labelKey: 'positiveObservation.individual' },
  { value: 'department', labelKey: 'positiveObservation.department' },
  { value: 'contractor', labelKey: 'positiveObservation.contractor' },
];

export const createQuickObservationSchema = (t: (key: string, options?: unknown) => string) => z.object({
  description: z.string().min(1, t('incidents.validation.descriptionRequired')).max(2000),
  subtype: z.string().min(1, t('incidents.validation.subtypeRequired')),
  severity_v2: z.enum(['level_1', 'level_2', 'level_3', 'level_4', 'level_5'] as const),
  observed_date: z.string().min(1, t('quickObservation.validation.dateRequired')),
  observed_time: z.string().min(1, t('quickObservation.validation.timeRequired')),
  site_id: z.string().min(1, t('incidents.validation.siteRequired', 'Site selection is required')),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  closed_on_spot: z.boolean().default(false),
  recognition_type: z.enum(['individual', 'department', 'contractor']).optional(),
  recognized_user_id: z.string().optional(),
  recognized_department_id: z.string().optional(),
  recognized_contractor_worker_id: z.string().optional(),
  is_against_contractor: z.boolean().default(false),
  related_contractor_company_id: z.string().optional(),
});

export type FormValues = z.infer<ReturnType<typeof createQuickObservationSchema>>;

export interface QuickObservationCardProps {
  onCancel: () => void;
}
