import { z } from 'zod';
import type { HierarchyLevel } from '@/lib/asset-hierarchy-import-utils';

export const assetHierarchyValidationSchema = z.object({
    level: z.enum(['Category', 'Type', 'Subtype', 'Part'] as [HierarchyLevel, ...HierarchyLevel[]]),
    code: z.string().min(1, 'Required'),
    nameEn: z.string().min(1, 'Required'),
    parentCode: z.string().optional().default(''),
});

export type AssetHierarchyValidationValues = z.infer<typeof assetHierarchyValidationSchema>;
