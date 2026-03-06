import { z } from 'zod';

export const addInspectionCategorySchema = z.object({
    code: z.string().min(1, 'Required'),
    name: z.string().min(1, 'Required'),
    description: z.string().optional().default(''),
    icon: z.string().optional().default(''),
    color: z.string().min(1, 'Required').default('#3b82f6'),
    sortOrder: z.number().min(1).default(100),
});

export type AddInspectionCategoryValues = z.infer<typeof addInspectionCategorySchema>;
