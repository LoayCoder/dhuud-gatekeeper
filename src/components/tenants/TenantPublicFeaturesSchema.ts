import { z } from 'zod';

export const tenantPublicFeaturesSchema = z.object({
    customDomain: z.string().optional().default(''),
    instructionsEn: z.string().optional().default(''),
    instructionsAr: z.string().optional().default(''),
});

export type TenantPublicFeaturesValues = z.infer<typeof tenantPublicFeaturesSchema>;
