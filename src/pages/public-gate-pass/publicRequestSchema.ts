import { z } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';

export const gatePassItemSchema = z.object({
  id: z.string(),
  sr_number: z.string(),
  item_name: z.string().min(1, 'Item name is required'),
  description: z.string(),
  quantity: z.string().min(1, 'Quantity is required'),
  unit: z.string().min(1, 'Unit is required'),
  photo: z.any().refine(
    (val) => val instanceof File,
    'Photo is required'
  ),
  photoPreviewUrl: z.string().nullable(),
});

export const publicRequestSchema = z.object({
  // Step 1 — Requester
  requesterName: z.string().min(2, 'Name must be at least 2 characters'),
  requesterPhone: z.string()
    .min(1, 'Phone is required')
    .refine(
      (val) => isValidPhoneNumber(val),
      'Invalid phone number'
    ),
  requesterEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  requesterCompany: z.string().min(2, 'Company name must be at least 2 characters'),
  branchId: z.string().optional().or(z.literal('')),

  // Step 2 — Vehicle
  vehiclePlateLetters: z.string().min(1, 'Plate letters required'),
  vehiclePlateNumbers: z.string().min(1, 'Plate numbers required'),
  driverName: z.string().min(1, 'Driver name required'),
  driverMobile: z.string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || isValidPhoneNumber(val),
      'Invalid mobile number'
    ),
  passType: z.enum(['in_out', 'out', 'in']),
  startDate: z.date(),
  endDate: z.date(),

  // Step 3 — Items
  items: z.array(gatePassItemSchema)
    .min(1, 'At least one item is required')
    .max(10, 'Maximum 10 items allowed'),

  // Step 4 — Notifications
  notifyWhatsapp: z.boolean(),
  notifyEmail: z.boolean(),
  notifySms: z.boolean(),
});

export type PublicRequestFormValues = z.infer<typeof publicRequestSchema>;
export type GatePassItemFormValues = z.infer<typeof gatePassItemSchema>;
