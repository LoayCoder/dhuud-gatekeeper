import { z } from 'zod';

export const adminEditObservationSchema = z.object({
  branchId: z.string().nullable(),
  siteId: z.string().nullable(),
  contractorId: z.string().nullable(),
  shouldReroute: z.boolean(),
  adminNotes: z.string(),
});

export type AdminEditObservationFormValues = z.infer<typeof adminEditObservationSchema>;
