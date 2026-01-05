import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface ShiftSwapRequest {
  id: string;
  tenant_id: string;
  requesting_guard_id: string;
  target_guard_id: string;
  original_roster_id: string;
  swap_roster_id: string | null;
  reason: string;
  status: string;
  requested_at: string;
  responded_at: string | null;
  supervisor_id: string | null;
  supervisor_approved_at: string | null;
  supervisor_notes: string | null;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
  // Joined fields
  requesting_guard?: { full_name: string } | null;
  target_guard?: { full_name: string } | null;
  original_roster?: {
    roster_date: string;
    security_zones?: { zone_name: string } | null;
    security_shifts?: { shift_name: string; start_time: string; end_time: string } | null;
  } | null;
  swap_roster?: {
    roster_date: string;
    security_zones?: { zone_name: string } | null;
    security_shifts?: { shift_name: string; start_time: string; end_time: string } | null;
  } | null;
  supervisor?: { full_name: string } | null;
}

export function useShiftSwapRequests(options?: { status?: string; myRequests?: boolean }) {
  return useQuery({
    queryKey: ['shift-swap-requests', options],
    queryFn: async (): Promise<ShiftSwapRequest[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Build query conditionally
      const baseFilters: Record<string, unknown> = {};
      if (options?.status) baseFilters.status = options.status;

      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .is('deleted_at', null)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      let result = data || [];

      // Filter by user if myRequests
      if (options?.myRequests) {
        result = result.filter(
          r => r.requesting_guard_id === user.id || r.target_guard_id === user.id
        );
      }

      // Filter by status if provided
      if (options?.status) {
        result = result.filter(r => r.status === options.status);
      }

      // Fetch related data for each request
      const enriched: ShiftSwapRequest[] = await Promise.all(
        result.map(async (r) => {
          const [reqGuard, tgtGuard, origRoster, swapRoster, supervisor] = await Promise.all([
            supabase.from('profiles').select('full_name').eq('id', r.requesting_guard_id).single(),
            supabase.from('profiles').select('full_name').eq('id', r.target_guard_id).single(),
            supabase.from('shift_roster').select('roster_date, security_zones(zone_name), security_shifts(shift_name, start_time, end_time)').eq('id', r.original_roster_id).single(),
            r.swap_roster_id 
              ? supabase.from('shift_roster').select('roster_date, security_zones(zone_name), security_shifts(shift_name, start_time, end_time)').eq('id', r.swap_roster_id).single()
              : Promise.resolve({ data: null }),
            r.supervisor_id
              ? supabase.from('profiles').select('full_name').eq('id', r.supervisor_id).single()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...r,
            requesting_guard: reqGuard.data,
            target_guard: tgtGuard.data,
            original_roster: origRoster.data as ShiftSwapRequest['original_roster'],
            swap_roster: swapRoster.data as ShiftSwapRequest['swap_roster'],
            supervisor: supervisor.data,
          };
        })
      );

      return enriched;
    },
  });
}

export function useMyPendingSwapRequests() {
  return useQuery({
    queryKey: ['my-pending-swap-requests'],
    queryFn: async (): Promise<ShiftSwapRequest[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('target_guard_id', user.id)
        .eq('status', 'pending')
        .is('deleted_at', null)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Enrich with related data
      const enriched: ShiftSwapRequest[] = await Promise.all(
        (data || []).map(async (r) => {
          const [reqGuard, origRoster] = await Promise.all([
            supabase.from('profiles').select('full_name').eq('id', r.requesting_guard_id).single(),
            supabase.from('shift_roster').select('roster_date, security_zones(zone_name), security_shifts(shift_name, start_time, end_time)').eq('id', r.original_roster_id).single(),
          ]);

          return {
            ...r,
            requesting_guard: reqGuard.data,
            original_roster: origRoster.data as ShiftSwapRequest['original_roster'],
          };
        })
      );

      return enriched;
    },
  });
}

export function useCreateSwapRequest() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      target_guard_id: string;
      original_roster_id: string;
      swap_roster_id?: string;
      reason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data: result, error } = await supabase
        .from('shift_swap_requests')
        .insert({
          tenant_id: profile.tenant_id,
          requesting_guard_id: user.id,
          target_guard_id: data.target_guard_id,
          original_roster_id: data.original_roster_id,
          swap_roster_id: data.swap_roster_id || null,
          reason: data.reason,
          status: 'pending',
          requested_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-pending-swap-requests'] });
      toast.success(t('security.swapRequest.created', 'Swap request sent'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error'), { description: error.message });
    },
  });
}

export function useRespondToSwapRequest() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      requestId: string;
      accept: boolean;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({
          status: data.accept ? 'accepted' : 'rejected',
          responded_at: new Date().toISOString(),
          notes: data.notes || null,
        })
        .eq('id', data.requestId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shift-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-pending-swap-requests'] });
      toast.success(
        variables.accept 
          ? t('security.swapRequest.accepted', 'Swap request accepted') 
          : t('security.swapRequest.rejected', 'Swap request rejected')
      );
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error'), { description: error.message });
    },
  });
}

export function useSupervisorApproveSwap() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      requestId: string;
      approve: boolean;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('shift_swap_requests')
        .update({
          status: data.approve ? 'approved' : 'rejected',
          supervisor_id: user.id,
          supervisor_approved_at: new Date().toISOString(),
          supervisor_notes: data.notes || null,
        })
        .eq('id', data.requestId);

      if (error) throw error;

      // If approved, swap the roster assignments
      if (data.approve) {
        const { data: request } = await supabase
          .from('shift_swap_requests')
          .select('original_roster_id, swap_roster_id, requesting_guard_id, target_guard_id')
          .eq('id', data.requestId)
          .single();

        if (request) {
          // Swap guard IDs in the roster entries
          await supabase
            .from('shift_roster')
            .update({ guard_id: request.target_guard_id })
            .eq('id', request.original_roster_id);

          if (request.swap_roster_id) {
            await supabase
              .from('shift_roster')
              .update({ guard_id: request.requesting_guard_id })
              .eq('id', request.swap_roster_id);
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shift-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      toast.success(
        variables.approve 
          ? t('security.swapRequest.approved', 'Swap approved and applied') 
          : t('security.swapRequest.supervisorRejected', 'Swap request rejected')
      );
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error'), { description: error.message });
    },
  });
}

export function useCancelSwapRequest() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swap-requests'] });
      toast.success(t('security.swapRequest.cancelled', 'Swap request cancelled'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error'), { description: error.message });
    },
  });
}
