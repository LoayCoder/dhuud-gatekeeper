import * as z from 'zod';
import { EnvironmentalContaminationEntry } from '@/lib/environmental-contamination-constants';

export const formSchema = z.object({
  // Section A
  contamination_types: z.array(z.string()).min(1, 'Select at least one contamination type'),
  contaminant_name: z.string().min(1, 'Contaminant name is required'),
  contaminant_type: z.string().optional(),
  hazard_classification: z.string().optional(),
  release_source: z.string().optional(),
  release_source_description: z.string().optional(),
  release_cause: z.string().optional(),
  release_cause_justification: z.string().optional(),
  // Section B
  volume_released: z.coerce.number().optional(),
  volume_unit: z.string().optional(),
  weight_released: z.coerce.number().optional(),
  weight_unit: z.string().optional(),
  area_affected_sqm: z.coerce.number().optional(),
  depth_cm: z.coerce.number().optional(),
  exposure_duration_minutes: z.coerce.number().optional(),
  // Section C
  secondary_containment_exists: z.boolean().default(false),
  containment_design_capacity: z.coerce.number().optional(),
  containment_capacity_unit: z.string().optional(),
  containment_retained_volume: z.coerce.number().optional(),
  containment_failure_reason: z.string().optional(),
  containment_failure_reason_other: z.string().optional(),
  // Section D
  impacted_receptors: z.array(z.string()).default([]),
  recovery_potential: z.string().optional(),
  population_exposed: z.boolean().default(false),
  population_affected_count: z.coerce.number().optional(),
  exposure_type: z.string().optional(),
  population_proximity: z.string().optional(),
  // Section E
  soil_remediation_cost: z.coerce.number().optional(),
  waste_disposal_cost: z.coerce.number().optional(),
  testing_analysis_cost: z.coerce.number().optional(),
  cleanup_contractor_cost: z.coerce.number().optional(),
  regulatory_fines: z.coerce.number().optional(),
  cost_currency: z.string().default('SAR'),
  // Section F
  applicable_regulation: z.string().optional(),
  regulatory_notification_required: z.boolean().default(false),
  authority_notified: z.array(z.string()).default([]),
  notification_date: z.string().optional(),
  notification_reference: z.string().optional(),
});

export type FormData = z.infer<typeof formSchema>;

export interface EnvironmentalContaminationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: EnvironmentalContaminationEntry | null;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}
