import { z } from 'zod';

export const securityShiftFormSchema = z.object({
  shift_name: z.string().min(1, 'Required'),
  shift_code: z.string().min(1, 'Required'),
  start_time: z.string().min(1, 'Required'),
  end_time: z.string().min(1, 'Required'),
  is_overnight: z.boolean(),
  break_duration_minutes: z.number().min(0),
  is_active: z.boolean(),
}) as z.ZodType<{
  shift_name: string;
  shift_code: string;
  start_time: string;
  end_time: string;
  is_overnight: boolean;
  break_duration_minutes: number;
  is_active: boolean;
}>;

export type SecurityShiftFormValues = z.infer<typeof securityShiftFormSchema>;
