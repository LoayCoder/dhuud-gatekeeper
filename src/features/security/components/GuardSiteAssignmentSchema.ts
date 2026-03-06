import { z } from 'zod';

export const guardSiteAssignmentSchema = z.object({
  guard_id: z.string().min(1, 'Required'),
  site_id: z.string().min(1, 'Required'),
  is_primary: z.boolean(),
  can_float: z.boolean(),
  assignment_type: z.enum(['permanent', 'temporary', 'floating']),
  effective_from: z.string().min(1, 'Required'),
});

export type GuardSiteAssignmentFormValues = z.infer<typeof guardSiteAssignmentSchema>;
