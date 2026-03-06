import { z } from 'zod';

export const generateScheduleSchema = z.object({
    depreciation_method: z.enum(['straight_line', 'declining_balance', 'units_of_production']),
    period_type: z.enum(['monthly', 'quarterly', 'yearly']),
    start_date: z.string().min(1, 'Required'),
    purchase_price: z.coerce.number().min(0),
    salvage_value: z.coerce.number().min(0),
    useful_life_years: z.coerce.number().min(1).max(100),
    declining_balance_rate: z.coerce.number().min(1).max(10),
});

export type GenerateScheduleValues = z.infer<typeof generateScheduleSchema>;
