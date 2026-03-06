import { z } from 'zod';

export const violationSettingsSchema = z.object({
    name: z.string().min(1, 'Required'),
    name_ar: z.string().optional().default(''),
    severity_level: z.string().min(1, 'Required'),
    first_action_type: z.string().min(1, 'Required'),
    first_fine_amount: z.number().optional(),
    first_action_description: z.string().optional().default(''),
    second_action_type: z.string().min(1, 'Required'),
    second_fine_amount: z.number().optional(),
    second_action_description: z.string().optional().default(''),
    third_action_type: z.string().min(1, 'Required'),
    third_fine_amount: z.number().optional(),
    third_action_description: z.string().optional().default(''),
});

export type ViolationSettingsValues = z.infer<typeof violationSettingsSchema>;
