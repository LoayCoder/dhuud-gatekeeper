import { supabase } from '@/integrations/supabase/client';

export interface CreateSupportTicketPayload {
  subject: string;
  description: string;
  category: string;
  priority: string;
  tenant_id?: string;
  created_by?: string;
}

export const createSupportTicket = async (payload: CreateSupportTicketPayload) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};
