import { z } from 'zod';

export const userFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().optional().or(z.literal('')),
  phone_number: z.string().optional(),
  user_type: z.enum(['employee', 'contractor_longterm', 'contractor_shortterm', 'member', 'visitor']),
  has_login: z.boolean().default(true),
  is_active: z.boolean().default(true),
  delivery_channel: z.enum(['email', 'whatsapp', 'both']).default('email'),
  employee_id: z.string().optional(),
  job_title: z.string().optional(),
  contractor_company_name: z.string().optional(),
  contract_start: z.string().optional(),
  contract_end: z.string().optional(),
  membership_id: z.string().optional(),
  membership_start: z.string().optional(),
  membership_end: z.string().optional(),
  has_full_branch_access: z.boolean().default(false),
  assigned_branch_id: z.string().optional().nullable(),
  assigned_division_id: z.string().optional().nullable(),
  assigned_department_id: z.string().optional().nullable(),
  assigned_section_id: z.string().optional().nullable(),
  assigned_site_id: z.string().optional().nullable(),
}).refine((data) => {
  if (data.has_login) {
    if (!data.email || data.email === '') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(data.email);
  }
  return true;
}, {
  message: 'Email is required when login is enabled',
  path: ['email'],
}).refine((data) => {
  if ((data.delivery_channel === 'whatsapp' || data.delivery_channel === 'both') && data.has_login) {
    return data.phone_number && data.phone_number.length > 0;
  }
  return true;
}, {
  message: 'Phone number is required for WhatsApp delivery',
  path: ['phone_number'],
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: unknown;
  onSave: (data: UserFormValues, selectedRoleIds: string[], emailChanged: boolean, originalEmail: string | null, selectedBranchIds: string[]) => Promise<void>;
}
