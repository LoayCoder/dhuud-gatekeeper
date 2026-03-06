import { z } from 'zod';

export const adminTicketReplySchema = z.object({
  newMessage: z.string().min(1, 'Message required'),
  isInternal: z.boolean(),
});

export type AdminTicketReplyFormValues = z.infer<typeof adminTicketReplySchema>;
