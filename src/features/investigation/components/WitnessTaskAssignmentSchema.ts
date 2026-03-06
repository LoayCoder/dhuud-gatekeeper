import { z } from 'zod';

export const witnessTaskAssignmentSchema = z.object({
    selectedUserId: z.string().min(1, 'Required'),
    witnessName: z.string().min(1, 'Required'),
    relationship: z.string().optional().default(''),
    notes: z.string().optional().default(''),
});

export type WitnessTaskAssignmentValues = z.infer<typeof witnessTaskAssignmentSchema>;
