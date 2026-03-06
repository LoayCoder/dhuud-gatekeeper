import { supabase } from '@/integrations/supabase/client';

export interface HandoverPayload {
  handover_type: 'vacation' | 'resignation';
  zone_id?: string;
  outstanding_issues: unknown[];
  equipment_checklist: unknown[];
  key_observations?: string;
  next_shift_priorities?: string;
  notes?: string;
  outgoing_signature?: string;
}

export const submitVacationHandover = async (
  payload: HandoverPayload
): Promise<void> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id')
    .single();

  if (!profile?.tenant_id) throw new Error('No tenant found');

  const { error } = await supabase
    .from('shift_handovers')
    .insert({
      tenant_id: profile.tenant_id,
      outgoing_guard_id: profile.id,
      zone_id: payload.zone_id || null,
      handover_type: payload.handover_type,
      requires_approval: true,
      outstanding_issues: payload.outstanding_issues as any,
      equipment_checklist: payload.equipment_checklist as any,
      key_observations: payload.key_observations || null,
      next_shift_priorities: payload.next_shift_priorities || null,
      notes: payload.notes || null,
      outgoing_signature: payload.outgoing_signature || null,
      signature_timestamp: payload.outgoing_signature ? new Date().toISOString() : null,
      status: 'pending',
    } as any);

  if (error) throw error;
};
