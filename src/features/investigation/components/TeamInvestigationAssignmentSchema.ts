import { z } from 'zod';

export const teamInvestigationAssignmentSchema = z.object({
    selectedInvestigator: z.string().optional().default(''),
    teamLeaderId: z.string().optional().default(''),
    teamMemberIds: z.array(z.string()).optional().default([]),
    assignmentNotes: z.string().optional().default(''),
    useTeamInvestigation: z.boolean().optional().default(false),
});

export type TeamInvestigationAssignmentValues = z.infer<typeof teamInvestigationAssignmentSchema>;
