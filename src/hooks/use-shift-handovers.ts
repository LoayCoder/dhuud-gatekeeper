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
  status: 'pending' | 'acknowledged' | 'completed' | 'cancelled' | 'approved' | 'rejected';
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
  // New approval fields
  handover_type: 'standard' | 'vacation' | 'resignation';
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  assigned_followup_guard_id: string | null;
  outgoing_guard?: {
    full_name: string | null;
  };
  incoming_guard?: {
    full_name: string | null;
  };
  approved_by_user?: {
    full_name: string | null;
  };
  followup_guard?: {
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

const HANDOVER_SELECT = `
  id, tenant_id, outgoing_guard_id, incoming_guard_id, shift_date, zone_id,
  handover_time, acknowledged_at, status, outstanding_issues, equipment_checklist,
  key_observations, visitor_info, next_shift_priorities, attachments, notes,
  outgoing_signature, incoming_signature, signature_timestamp, created_at, updated_at,
  handover_type, requires_approval, approved_by, approved_at, rejection_reason, assigned_followup_guard_id,
  outgoing_guard:profiles!shift_handovers_outgoing_guard_id_fkey(full_name),
  incoming_guard:profiles!shift_handovers_incoming_guard_id_fkey(full_name),
  approved_by_user:profiles!shift_handovers_approved_by_fkey(full_name),
  followup_guard:profiles!shift_handovers_assigned_followup_guard_id_fkey(full_name),
  zone:security_zones(zone_name)
`;

export function useShiftHandovers(dateFilter?: string) {
  return useQuery({
    queryKey: ['shift-handovers', dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('shift_handovers')
        .select(HANDOVER_SELECT)
        .is('deleted_at', null)
        .order('handover_time', { ascending: false });

      if (dateFilter) {
        query = query.eq('shift_date', dateFilter);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as unknown as ShiftHandover[];
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
        .select(HANDOVER_SELECT)
        .is('deleted_at', null)
        .eq('status', 'pending')
        .order('handover_time', { ascending: false });

      if (error) throw error;
      return data as unknown as ShiftHandover[];
    },
  });
}

export function usePendingApprovalHandovers() {
  return useQuery({
    queryKey: ['shift-handovers', 'pending-approval'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_handovers')
        .select(HANDOVER_SELECT)
        .is('deleted_at', null)
        .eq('requires_approval', true)
        .eq('status', 'pending')
        .order('handover_time', { ascending: false });

      if (error) throw error;
      return data as unknown as ShiftHandover[];
    },
  });
}

export function useVacationResignationHandovers() {
  return useQuery({
    queryKey: ['shift-handovers', 'vacation-resignation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_handovers')
        .select(HANDOVER_SELECT)
        .is('deleted_at', null)
        .in('handover_type', ['vacation', 'resignation'])
        .order('handover_time', { ascending: false });

      if (error) throw error;
      return data as unknown as ShiftHandover[];
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
      handover_type?: 'standard' | 'vacation' | 'resignation';
      requires_approval?: boolean;
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
        handover_type: params.handover_type || 'standard',
        requires_approval: params.requires_approval || false,
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

export function useApproveHandover() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { handoverId: string; followupGuardId: string }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .single();

      const { data, error } = await supabase
        .from('shift_handovers')
        .update({
          status: 'approved',
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
          assigned_followup_guard_id: params.followupGuardId,
        })
        .eq('id', params.handoverId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      toast({ title: 'Handover approved' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to approve handover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRejectHandover() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { handoverId: string; reason: string }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .single();

      const { data, error } = await supabase
        .from('shift_handovers')
        .update({
          status: 'rejected',
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: params.reason,
        })
        .eq('id', params.handoverId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      toast({ title: 'Handover rejected' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to reject handover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateHandover() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      outstanding_issues?: OutstandingIssue[];
      equipment_checklist?: EquipmentItem[];
      key_observations?: string;
      visitor_info?: string;
      next_shift_priorities?: string;
      notes?: string;
      outgoing_signature?: string;
    }) => {
      const updateData: Record<string, any> = {
        status: 'pending', // Reset to pending after edit
      };
      
      if (params.outstanding_issues) updateData.outstanding_issues = params.outstanding_issues as unknown as Json;
      if (params.equipment_checklist) updateData.equipment_checklist = params.equipment_checklist as unknown as Json;
      if (params.key_observations !== undefined) updateData.key_observations = params.key_observations;
      if (params.visitor_info !== undefined) updateData.visitor_info = params.visitor_info;
      if (params.next_shift_priorities !== undefined) updateData.next_shift_priorities = params.next_shift_priorities;
      if (params.notes !== undefined) updateData.notes = params.notes;
      if (params.outgoing_signature) {
        updateData.outgoing_signature = params.outgoing_signature;
        updateData.signature_timestamp = new Date().toISOString();
      }
      updateData.rejection_reason = null; // Clear rejection reason

      const { data, error } = await supabase
        .from('shift_handovers')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      toast({ title: 'Handover updated' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update handover',
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
