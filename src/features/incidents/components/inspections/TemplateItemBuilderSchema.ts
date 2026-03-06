import { z } from 'zod';

export const templateItemSchema = z.object({
  question: z.string().min(1, 'Required'),
  question_ar: z.string().optional().default(''),
  response_type: z.string().min(1),
  min_value: z.string().optional().default(''),
  max_value: z.string().optional().default(''),
  rating_scale: z.string().optional().default('5'),
  is_critical: z.boolean(),
  is_required: z.boolean(),
  instructions: z.string().optional().default(''),
  instructions_ar: z.string().optional().default(''),
});

export type TemplateItemFormValues = z.infer<typeof templateItemSchema>;
