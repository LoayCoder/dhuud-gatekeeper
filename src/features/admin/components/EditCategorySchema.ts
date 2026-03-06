import { z } from 'zod';

export const editCategorySchema = z.object({
    nameKey: z.string().min(1, 'Required'),
    icon: z.string().optional().default(''),
    sortOrder: z.number().min(1).default(100),
});

export type EditCategoryValues = z.infer<typeof editCategorySchema>;
