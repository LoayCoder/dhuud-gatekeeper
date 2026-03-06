import { z } from 'zod';

export const investigationSLASchema = z.object({
    target_days: z.number().min(1),
    warning_days_before: z.number().min(1),
    escalation_days_after: z.number().min(1),
    second_escalation_days_after: z.number().min(0).default(0),
}).superRefine((data, ctx) => {
    if (data.warning_days_before >= data.target_days) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Warning days must be less than target days',
            path: ['warning_days_before'],
        });
    }
});

export type InvestigationSLAValues = z.infer<typeof investigationSLASchema>;
