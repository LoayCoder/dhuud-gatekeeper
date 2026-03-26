import { z } from 'zod';

export const createSessionSchema = z.object({
  sessionType: z.string().min(1, 'Required'),
  templateId: z.string().min(1, 'Required'),
  branchId: z.string().optional().default(''),
  siteId: z.string().optional().default(''),
  buildingId: z.string().optional().default(''),
  categoryId: z.string().optional().default(''),
  typeId: z.string().optional().default(''),
  subtypeId: z.string().optional().default(''),
  periodDate: z.date(),
});

export type CreateSessionFormValues = z.infer<typeof createSessionSchema>;
