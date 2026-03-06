import { z } from 'zod';

export const observationAISettingsSchema = z.object({
    rewrite_rules: z.object({
        enable_translation: z.boolean(),
        target_language: z.string(),
    }),
    classification: z.object({
        enable_positive_negative: z.boolean(),
        observation_types: z.array(z.string()),
        severity_levels: z.array(z.string()),
    }),
    tagging: z.object({
        enabled: z.boolean(),
        auto_apply: z.boolean(),
    }),
});

export type ObservationAISettingsFormValues = z.infer<typeof observationAISettingsSchema>;
