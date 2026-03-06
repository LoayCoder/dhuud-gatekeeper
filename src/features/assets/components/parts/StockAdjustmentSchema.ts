import { z } from 'zod';

export const stockAdjustmentSchema = z.object({
    transactionType: z.enum(['receipt', 'issue', 'adjustment', 'return']).default('receipt'),
    quantity: z.string().min(1, 'Required'),
    unitCost: z.string().optional().default(''),
    notes: z.string().optional().default(''),
});

export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>;
