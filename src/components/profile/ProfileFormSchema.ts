import { z } from 'zod';

export const profileFormSchema = z.object({
  fullName: z.string().trim().max(100).optional().default(''),
  avatarUrl: z.string().optional().default(''),
  phoneNumber: z.string().trim().max(20).optional().default(''),
  emergencyContactName: z.string().trim().max(100).optional().default(''),
  emergencyContactPhone: z.string().trim().max(20).optional().default(''),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
