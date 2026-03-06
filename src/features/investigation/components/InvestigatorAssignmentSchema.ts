import { z } from 'zod';

export const investigatorAssignmentSchema = z.object({
  selectedInvestigator: z.string().min(1, 'Required'),
  notes: z.string().optional().default(''),
});

export type InvestigatorAssignmentFormValues = z.infer<typeof investigatorAssignmentSchema>;
