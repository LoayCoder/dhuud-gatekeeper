import { z } from 'zod';

export const violationFormSchema = z.object({
  violationType: z.string().min(1, 'Required'),
  description: z.string().optional().default(''),
  fineAmount: z.string().optional().default(''),
  currency: z.string(),
  status: z.enum(['draft', 'pending_approval', 'finalized', 'rejected']),
});

export type ViolationFormValues = z.infer<typeof violationFormSchema>;
