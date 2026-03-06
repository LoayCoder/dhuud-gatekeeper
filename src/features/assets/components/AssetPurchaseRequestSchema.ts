import { z } from 'zod';

export const assetPurchaseRequestSchema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string(),
  estimated_cost: z.number().min(0),
  quantity: z.number().min(1),
  currency: z.string(),
  justification: z.string(),
  vendor_name: z.string(),
  budget_code: z.string(),
});

export type AssetPurchaseRequestFormValues = z.infer<typeof assetPurchaseRequestSchema>;
