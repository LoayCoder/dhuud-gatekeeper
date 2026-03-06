import { z } from 'zod';

export const teamTaskAssignmentSchema = z.object({
    selectedMember: z.string().min(1, 'Required'),
    taskType: z.string().min(1, 'Required'),
    taskDescription: z.string().min(1, 'Required'),
    targetArea: z.string().optional().default(''),
});

export type TeamTaskAssignmentValues = z.infer<typeof teamTaskAssignmentSchema>;
