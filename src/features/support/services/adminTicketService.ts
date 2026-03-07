import { supabase } from '@/integrations/supabase/client';

export const sendTicketMessage = async (payload: {
  ticket_id: string;
  message: string;
  is_internal: boolean;
  sender_id: string;
  tenant_id: string;
}) => {
  const { error } = await supabase
    .from('ticket_messages' as never)
    .insert(payload as never);
  if (error) throw error;
};

export const updateTicketStatus = async (
  ticketId: string,
  updates: Record<string, unknown>
) => {
  const { error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId);
  if (error) throw error;
};
