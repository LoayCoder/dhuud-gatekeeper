import { z } from 'zod';

export const incidentClosureSchema = z.object({
    notes: z.string().optional().default(''),
    evidence: z.boolean().default(false),
    witnesses: z.boolean().default(false),
    rca: z.boolean().default(false),
    actions: z.boolean().default(false),
});

export type IncidentClosureValues = z.infer<typeof incidentClosureSchema>;
