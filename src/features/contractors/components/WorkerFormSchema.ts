import { z } from 'zod';

export const workerFormSchema = z.object({
  company_id: z.string().min(1, 'Required'),
  full_name: z.string().min(1, 'Required'),
  national_id: z.string().min(1, 'Required'),
  nationality: z.string(),
  mobile_number: z.string().min(1, 'Required'),
  preferred_language: z.string(),
  photo_path: z.string().nullable(),
});

export type WorkerFormValues = z.infer<typeof workerFormSchema>;
