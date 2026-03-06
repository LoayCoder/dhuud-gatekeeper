import { z } from 'zod';

export const witnessDirectEntrySchema = z.object({
    witnessName: z.string().min(1, 'Required'),
    witnessContact: z.string().optional().default(''),
    relationship: z.string().optional().default(''),
    statementText: z.string().min(1, 'Required'),
});

export type WitnessDirectEntryValues = z.infer<typeof witnessDirectEntrySchema>;
