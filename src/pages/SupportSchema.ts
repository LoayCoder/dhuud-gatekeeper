import { z } from 'zod';

export const supportTicketSchema = z.object({
  subject: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  category: z.enum(['general', 'technical', 'billing', 'feature_request']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

export type SupportTicketFormValues = z.infer<typeof supportTicketSchema>;
