import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface OutstandingIssue {
  id: string;
  description: string;
  priority: string;
  resolved: boolean;
}

export interface EquipmentItem {
  item: string;
  status: 'ok' | 'damaged' | 'missing';
  notes?: string;
}

export interface ShiftHandover {
  id: string;
  tenant_id: string;
  outgoing_guard_id: string;
  incoming_guard_id: string | null;
  shift_date: string;
  zone_id: string | null;
  handover_time: string;
  acknowledged_at: string | null;
  status: 'pending' | 'acknowledged' | 'completed' | 'cancelled';
  outstanding_issues: Json;
  equipment_checklist: Json;
  key_observations: string | null;
  visitor_info: string | null;
  next_shift_priorities: string | null;
  attachments: Json;
  notes: string | null;
  outgoing_signature: string | null;
  incoming_signature: string | null;
  signature_timestamp: string | null;
  created_at: string;
  updated_at: string;
  outgoing_guard?: {
    full_name: string | null;
  };
  incoming_guard?: {
    full_name: string | null;
  };
  zone?: {
    zone_name: string | null;
  };
}

// Helper to safely parse JSONB arrays
export function parseOutstandingIssues(data: Json | null | undefined): OutstandingIssue[] {
  if (!data || !Array.isArray(data)) return [];
  return data as unknown as OutstandingIssue[];
}

export function parseEquipmentChecklist(data: Json | null | undefined): EquipmentItem[] {
  if (!data || !Array.isArray(data)) return [];
  return data as unknown as EquipmentItem[];
}

export function useShiftHandovers(dateFilter?: string) {
  return useQuery({
    queryKey: ['shift-handovers', dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('shift_handovers')
        .select(`
          id,
          tenant_id,
          outgoing_guard_id,
          incoming_guard_id,
          shift_date,
          zone_id,
          handover_time,
          acknowledged_at,
          status,
          outstanding_issues,
          equipment_checklist,
          key_observations,
          visitor_info,
          next_shift_priorities,
          attachments,
          notes,
          outgoing_signature,
          incoming_signature,
          signature_timestamp,
          created_at,
          updated_at,
          outgoing_guard:profiles!shift_handovers_outgoing_guard_id_fkey(full_name),
          incoming_guard:profiles!shift_handovers_incoming_guard_id_fkey(full_name),
          zone:security_zones(zone_name)
        `)
        .is('deleted_at', null)
        .order('handover_time', { ascending: false });

      if (dateFilter) {
        query = query.eq('shift_date', dateFilter);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as ShiftHandover[];
    },
  });
}

export function useTodaysHandovers() {
  const today = new Date().toISOString().split('T')[0];
  return useShiftHandovers(today);
}

export function usePendingHandovers() {
  return useQuery({
    queryKey: ['shift-handovers', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_handovers')
        .select(`
          id,
          tenant_id,
          outgoing_guard_id,
          incoming_guard_id,
          shift_date,
          zone_id,
          handover_time,
          acknowledged_at,
          status,
          outstanding_issues,
          equipment_checklist,
          key_observations,
          visitor_info,
          next_shift_priorities,
          attachments,
          notes,
          outgoing_signature,
          incoming_signature,
          signature_timestamp,
          created_at,
          updated_at,
          outgoing_guard:profiles!shift_handovers_outgoing_guard_id_fkey(full_name),
          incoming_guard:profiles!shift_handovers_incoming_guard_id_fkey(full_name),
          zone:security_zones(zone_name)
        `)
        .is('deleted_at', null)
        .eq('status', 'pending')
        .order('handover_time', { ascending: false });

      if (error) throw error;
      return data as ShiftHandover[];
    },
  });
}

export function useCreateShiftHandover() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      incoming_guard_id?: string;
      zone_id?: string;
      outstanding_issues?: OutstandingIssue[];
      equipment_checklist?: EquipmentItem[];
      key_observations?: string;
      visitor_info?: string;
      next_shift_priorities?: string;
      notes?: string;
      outgoing_signature?: string;
    }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const insertData = {
        tenant_id: profile.tenant_id,
        outgoing_guard_id: profile.id,
        incoming_guard_id: params.incoming_guard_id || null,
        zone_id: params.zone_id || null,
        outstanding_issues: (params.outstanding_issues || []) as unknown as Json,
        equipment_checklist: (params.equipment_checklist || []) as unknown as Json,
        key_observations: params.key_observations || null,
        visitor_info: params.visitor_info || null,
        next_shift_priorities: params.next_shift_priorities || null,
        notes: params.notes || null,
        outgoing_signature: params.outgoing_signature || null,
        signature_timestamp: params.outgoing_signature ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('shift_handovers')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      toast({ title: 'Shift handover created' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create handover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAcknowledgeHandover() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { handoverId: string; incoming_signature: string }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .single();

      const { data, error } = await supabase
        .from('shift_handovers')
        .update({
          incoming_guard_id: profile?.id,
          acknowledged_at: new Date().toISOString(),
          status: 'acknowledged',
          incoming_signature: params.incoming_signature,
          signature_timestamp: new Date().toISOString(),
        })
        .eq('id', params.handoverId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      toast({ title: 'Handover acknowledged' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to acknowledge handover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCompleteHandover() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (handoverId: string) => {
      const { data, error } = await supabase
        .from('shift_handovers')
        .update({ status: 'completed' })
        .eq('id', handoverId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      toast({ title: 'Handover completed' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to complete handover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
