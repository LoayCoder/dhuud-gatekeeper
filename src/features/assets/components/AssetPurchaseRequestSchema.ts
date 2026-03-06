import { z } from 'zod';

export const assetPurchaseRequestSchema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional().default(''),
  estimated_cost: z.number().min(0),
  quantity: z.number().min(1),
  currency: z.string(),
  justification: z.string().optional().default(''),
  vendor_name: z.string().optional().default(''),
  budget_code: z.string().optional().default(''),
});

export type AssetPurchaseRequestFormValues = z.infer<typeof assetPurchaseRequestSchema>;
