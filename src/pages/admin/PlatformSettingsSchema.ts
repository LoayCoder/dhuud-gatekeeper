import { z } from 'zod';

export const platformSettingsSchema = z.object({
    enabled: z.boolean().default(true),
    duration_ms: z.number().min(2000).max(6000).default(3000),
    message_ar: z.string().default(''),
    message_en: z.string().default(''),
    subtitle_ar: z.string().default(''),
    subtitle_en: z.string().default(''),
});

export type PlatformSettingsValues = z.infer<typeof platformSettingsSchema>;
