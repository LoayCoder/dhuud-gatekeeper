import { z } from 'zod';

export const generateScheduleSchema = z.object({
    depreciation_method: z.enum(['straight_line', 'declining_balance', 'units_of_production']).default('straight_line'),
    period_type: z.enum(['monthly', 'quarterly', 'yearly']).default('yearly'),
    start_date: z.string().min(1, 'Required'),
    purchase_price: z.number().min(0).default(0),
    salvage_value: z.number().min(0).default(0),
    useful_life_years: z.number().min(1).max(100).default(5),
    declining_balance_rate: z.number().min(1).max(10).default(2),
});

export type GenerateScheduleValues = z.infer<typeof generateScheduleSchema>;
