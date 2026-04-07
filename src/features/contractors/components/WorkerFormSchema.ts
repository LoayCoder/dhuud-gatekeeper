import { z } from 'zod';

export const workerFormSchema = z.object({
  company_id: z.string().min(1, 'Required'),
  full_name: z.string().min(1, 'Required'),
  full_name_ar: z.string().optional(),
  id_type: z.string().default('national_id'),
  national_id: z.string().min(1, 'Required'),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string(),
  mobile_number: z.string().min(1, 'Required'),
  email: z.string().email().optional().or(z.literal('')),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  worker_role: z.string().optional(),
  preferred_language: z.string(),
  fitness_to_work: z.string().optional(),
  fitness_acknowledged: z.boolean().default(false),
  medical_check_date: z.string().optional(),
  fitness_expiry_date: z.string().optional(),
  training_certifications: z.array(z.string()).default([]),
  project_id: z.string().optional(),
  photo_path: z.string().nullable(),
});

export type WorkerFormValues = z.infer<typeof workerFormSchema>;
