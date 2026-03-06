import { z } from 'zod';

export const moduleManagementSchema = z.object({
    code: z.string().min(1, 'Required'),
    name: z.string().min(1, 'Required'),
    description: z.string().optional().default(''),
    base_price_monthly: z.number().min(0).default(0),
    base_price_yearly: z.number().min(0).default(0),
    is_active: z.boolean().default(true),
    sort_order: z.number().min(0).default(0),
    icon: z.string().default('Package'),
});

export type ModuleManagementValues = z.infer<typeof moduleManagementSchema>;
