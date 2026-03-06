import { z } from 'zod';

export const createAuditSessionSchema = z.object({
  templateId: z.string().min(1, 'Required'),
  branchId: z.string().optional().default(''),
  siteId: z.string().optional().default(''),
  buildingId: z.string().optional().default(''),
  periodDate: z.date(),
  scopeNotes: z.string().optional().default(''),
  auditObjective: z.string().optional().default(''),
});

export type CreateAuditSessionFormValues = z.infer<typeof createAuditSessionSchema>;
