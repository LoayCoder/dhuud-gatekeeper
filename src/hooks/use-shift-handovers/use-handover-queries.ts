import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ShiftHandover } from './types';
import { HANDOVER_SELECT } from './types';

export function useShiftHandovers(dateFilter?: string) {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;

    return useQuery({
        queryKey: ['shift-handovers', tenantId, dateFilter],
        queryFn: async () => {
            if (!tenantId) return [];

            let query = supabase
                .from('shift_handovers')
                .select(HANDOVER_SELECT)
                .eq('tenant_id', tenantId)
                .is('deleted_at', null)
                .order('handover_time', { ascending: false });

            if (dateFilter) {
                query = query.eq('shift_date', dateFilter);
            }

            const { data, error } = await query.limit(50);
            if (error) throw error;
            return data as unknown as ShiftHandover[];
        },
        enabled: !!tenantId,
    });
}

export function useTodaysHandovers() {
    const today = new Date().toISOString().split('T')[0];
    return useShiftHandovers(today);
}

export function usePendingHandovers() {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;

    return useQuery({
        queryKey: ['shift-handovers', tenantId, 'pending'],
        queryFn: async () => {
            if (!tenantId) return [];

            const { data, error } = await supabase
                .from('shift_handovers')
                .select(HANDOVER_SELECT)
                .eq('tenant_id', tenantId)
                .is('deleted_at', null)
                .eq('status', 'pending')
                .order('handover_time', { ascending: false });

            if (error) throw error;
            return data as unknown as ShiftHandover[];
        },
        enabled: !!tenantId,
    });
}

export function usePendingApprovalHandovers() {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;

    return useQuery({
        queryKey: ['shift-handovers', tenantId, 'pending-approval'],
        queryFn: async () => {
            if (!tenantId) return [];

            const { data, error } = await supabase
                .from('shift_handovers')
                .select(HANDOVER_SELECT)
                .eq('tenant_id', tenantId)
                .is('deleted_at', null)
                .eq('requires_approval', true)
                .eq('status', 'pending')
                .order('handover_time', { ascending: false });

            if (error) throw error;
            return data as unknown as ShiftHandover[];
        },
        enabled: !!tenantId,
    });
}

export function useVacationResignationHandovers() {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;

    return useQuery({
        queryKey: ['shift-handovers', tenantId, 'vacation-resignation'],
        queryFn: async () => {
            if (!tenantId) return [];

            const { data, error } = await supabase
                .from('shift_handovers')
                .select(HANDOVER_SELECT)
                .eq('tenant_id', tenantId)
                .is('deleted_at', null)
                .in('handover_type', ['vacation', 'resignation'])
                .order('handover_time', { ascending: false });

            if (error) throw error;
            return data as unknown as ShiftHandover[];
        },
        enabled: !!tenantId,
    });
}
