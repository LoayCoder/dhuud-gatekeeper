import { z } from 'zod';

export const specialEventSchema = z.object({
    name: z.string().min(1, 'Required'),
    description: z.string().optional().default(''),
    start_at: z.string().min(1, 'Required'),
    end_at: z.string().min(1, 'Required'),
    is_active: z.boolean().default(true),
}).superRefine((data, ctx) => {
    if (data.start_at && data.end_at) {
        if (new Date(data.end_at) <= new Date(data.start_at)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Must be after start date',
                path: ['end_at'],
            });
        }
    }
});

export type SpecialEventFormValues = z.infer<typeof specialEventSchema>;
