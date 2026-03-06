import { z } from 'zod';

export const siteDetailSchema = z.object({
    name: z.string().min(1, 'Required'),
    branchId: z.string().nullable().default(null),
    geofenceRadius: z.number().min(10).default(100),
    selectedDepartmentId: z.string().default(''),
    selectedSectionId: z.string().default(''),
});

export type SiteDetailValues = z.infer<typeof siteDetailSchema>;
