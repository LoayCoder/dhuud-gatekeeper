import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useShiftRoster(filters?: { date?: string; zoneId?: string; shiftId?: string }) {
  return useQuery({
    queryKey: ['shift-roster', filters],
    queryFn: async () => {
      let query = supabase
        .from('shift_roster')
        .select('*')
        .is('deleted_at', null)
        .order('assignment_date', { ascending: false });

      if (filters?.date) query = query.eq('assignment_date', filters.date);
      if (filters?.zoneId) query = query.eq('security_zone_id', filters.zoneId);
      if (filters?.shiftId) query = query.eq('shift_id', filters.shiftId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useMyRosterAssignment() {
  return useQuery({
    queryKey: ['my-roster-assignment'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('shift_roster')
        .select('*')
        .eq('guard_id', user.id)
        .eq('assignment_date', today)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRosterAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assignment: { guard_id: string; security_zone_id: string; shift_id: string; assignment_date: string; notes?: string; status?: string }) => {
      const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { data, error } = await supabase
        .from('shift_roster')
        .insert({ ...assignment, tenant_id: profile.tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      toast({ title: 'Assignment created' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create assignment', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteRosterAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shift_roster')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      toast({ title: 'Assignment deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    },
  });
}

export function useGuardCheckIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, lat, lng }: { id: string; lat: number; lng: number }) => {
      const { data, error } = await supabase
        .from('shift_roster')
        .update({ status: 'checked_in', check_in_time: new Date().toISOString(), check_in_lat: lat, check_in_lng: lng })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      queryClient.invalidateQueries({ queryKey: ['my-roster-assignment'] });
      toast({ title: 'Checked in successfully' });
    },
    onError: (error) => {
      toast({ title: 'Check-in failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useGuardCheckOut() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, lat, lng }: { id: string; lat: number; lng: number }) => {
      const { data, error } = await supabase
        .from('shift_roster')
        .update({ status: 'completed', check_out_time: new Date().toISOString(), check_out_lat: lat, check_out_lng: lng })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      queryClient.invalidateQueries({ queryKey: ['my-roster-assignment'] });
      toast({ title: 'Checked out successfully' });
    },
    onError: (error) => {
      toast({ title: 'Check-out failed', description: error.message, variant: 'destructive' });
    },
  });
}
