import { z } from 'zod';

export const purchaseOrderSchema = z.object({
    supplierName: z.string().optional().default(''),
    supplierContact: z.string().optional().default(''),
    orderDate: z.string().optional().default(''),
    expectedDate: z.string().optional().default(''),
    notes: z.string().optional().default(''),
});

export type PurchaseOrderValues = z.infer<typeof purchaseOrderSchema>;
