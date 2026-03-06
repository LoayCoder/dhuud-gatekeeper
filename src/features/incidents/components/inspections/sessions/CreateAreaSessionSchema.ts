import { z } from 'zod';

export const createAreaSessionSchema = z.object({
  templateId: z.string().min(1, 'Required'),
  branchId: z.string().optional().default(''),
  siteId: z.string().optional().default(''),
  buildingId: z.string().optional().default(''),
  floorZoneId: z.string().optional().default(''),
  periodDate: z.date(),
  scopeNotes: z.string().optional().default(''),
  weatherConditions: z.string().optional().default(''),
});

export type CreateAreaSessionFormValues = z.infer<typeof createAreaSessionSchema>;
