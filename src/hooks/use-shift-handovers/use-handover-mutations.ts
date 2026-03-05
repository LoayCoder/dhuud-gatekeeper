import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import type { OutstandingIssue, EquipmentItem } from './types';

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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('id, tenant_id')
                .eq('id', user.id)
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
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
            const updateData: Record<string, unknown> = {
                status: 'pending',
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
            updateData.rejection_reason = null;

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
