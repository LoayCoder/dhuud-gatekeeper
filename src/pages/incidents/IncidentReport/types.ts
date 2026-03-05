import { z } from 'zod';

export const createIncidentFormSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(5, t('incidents.validation.titleMinLength')).max(120),
  description: z.string().min(20, t('incidents.validation.descriptionMinLength')).max(5000),
  event_type: z.enum(['observation', 'incident'], { required_error: t('incidents.validation.eventTypeRequired') }),
  incident_type: z.string().min(1, t('incidents.validation.incidentTypeRequired')), // HSSE Event Type (top-level category for incidents)
  subtype: z.string().min(1, t('incidents.validation.subtypeRequired')),
  occurred_at: z.string().min(1, t('incidents.validation.dateTimeRequired')),
  site_id: z.string().min(1, t('incidents.validation.siteRequired')),
  branch_id: z.string().min(1, t('incidents.validation.branchRequired')),
  department_id: z.string().min(1, t('incidents.validation.departmentRequired')),
  location: z.string().min(1, t('incidents.validation.locationRequired')),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  severity: z.enum(['level_1', 'level_2', 'level_3', 'level_4', 'level_5'], { required_error: t('incidents.validation.severityRequired') }),
  risk_rating: z.enum(['low', 'medium', 'high']).optional(), // For observations only
  erp_activated: z.boolean().optional(),
  severity_override_reason: z.string().optional(),
  injury_classification: z.string().optional(),
  immediate_actions: z.string().min(1, t('incidents.validation.immediateActionsRequired')),
  has_injury: z.boolean().default(false),
  injury_count: z.number().optional(),
  injury_description: z.string().optional(),
  has_damage: z.boolean().default(false),
  damage_description: z.string().optional(),
  damage_cost: z.number().optional(),
  // Report against contractor for incidents
  is_against_contractor: z.boolean().default(false),
  related_contractor_company_id: z.string().optional(),
});

export type FormValues = z.infer<ReturnType<typeof createIncidentFormSchema>>;

// EVENT_CATEGORIES removed - wizard is now incident-only, observations use QuickObservationCard
