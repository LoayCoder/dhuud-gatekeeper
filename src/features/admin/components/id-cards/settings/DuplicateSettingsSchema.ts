import { z } from 'zod';

export const duplicateSettingsSchema = z.object({
    sourceCardType: z.string().min(1, 'Required'),
    includeFields: z.boolean().default(true),
    includeColors: z.boolean().default(true),
    includeBackSettings: z.boolean().default(true),
    includeBranding: z.boolean().default(true),
});

export type DuplicateSettingsValues = z.infer<typeof duplicateSettingsSchema>;
