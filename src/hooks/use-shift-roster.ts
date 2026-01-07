import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RosterAssignment {
  id: string;
  guard_id: string;
  zone_id: string;
  shift_id: string;
  roster_date: string;
  supervisor_id: string | null;
  status: string | null;
  notes: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  guard?: { full_name: string | null };
  supervisor?: { full_name: string | null };
  zone?: { zone_name: string | null; zone_code: string | null };
  shift?: { shift_name: string | null; start_time: string | null; end_time: string | null };
}

export function useShiftRoster(filters?: { date?: string; zoneId?: string; shiftId?: string }) {
  return useQuery({
    queryKey: ['shift-roster', filters],
    queryFn: async () => {
      let query = supabase
        .from('shift_roster')
        .select(`
          id, guard_id, zone_id, shift_id, roster_date, supervisor_id, status, notes,
          check_in_time, check_out_time, check_in_lat, check_in_lng, check_out_lat, check_out_lng,
          guard:profiles!shift_roster_guard_id_fkey(full_name),
          supervisor:profiles!shift_roster_supervisor_id_fkey(full_name),
          zone:security_zones(zone_name, zone_code),
          shift:security_shifts(shift_name, start_time, end_time)
        `)
        .is('deleted_at', null)
        .order('roster_date', { ascending: false });

      if (filters?.date) query = query.eq('roster_date', filters.date);
      if (filters?.zoneId) query = query.eq('zone_id', filters.zoneId);
      if (filters?.shiftId) query = query.eq('shift_id', filters.shiftId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RosterAssignment[];
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
        .select(`
          id, guard_id, zone_id, shift_id, roster_date, supervisor_id, status, notes,
          check_in_time, check_out_time,
          supervisor:profiles!shift_roster_supervisor_id_fkey(full_name),
          zone:security_zones(zone_name, zone_code),
          shift:security_shifts(shift_name, start_time, end_time)
        `)
        .eq('guard_id', user.id)
        .eq('roster_date', today)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useSupervisors() {
  return useQuery({
    queryKey: ['security-supervisors'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) return [];

      // Get users with supervisor or manager roles from user_role_assignments
      const { data: roleAssignments, error } = await supabase
        .from('user_role_assignments')
        .select(`
          user_id,
          role:roles!inner (
            code,
            name
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);

      if (error) throw error;
      
      // Filter to security supervisor/manager roles
      const supervisorRoles = ['security_supervisor', 'security_manager'];
      const supervisorAssignments = (roleAssignments || []).filter(ra => {
        const roleCode = (ra.role as { code: string } | null)?.code;
        return roleCode && supervisorRoles.includes(roleCode);
      });

      // Get unique user IDs
      const userIds = [...new Set(supervisorAssignments.map(r => r.user_id))];
      if (!userIds.length) return [];
      
      // Get profile info for these users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);
      
      // Map with roles
      const roleMap = new Map<string, string>();
      supervisorAssignments.forEach(r => {
        const roleCode = (r.role as { code: string } | null)?.code || 'supervisor';
        roleMap.set(r.user_id, roleCode);
      });
      
      return (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name || 'Unknown',
        role: roleMap.get(p.id) || 'supervisor'
      }));
    },
  });
}

export function useCreateRosterAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assignment: { 
      guard_id: string; 
      zone_id: string; 
      shift_id: string; 
      roster_date: string; 
      supervisor_id?: string;
      notes?: string; 
      status?: string 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { data, error } = await supabase
        .from('shift_roster')
        .insert({ ...assignment, tenant_id: profile.tenant_id } as any)
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

export function useUpdateRosterAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { 
      id: string; 
      guard_id?: string; 
      zone_id?: string; 
      shift_id?: string; 
      supervisor_id?: string;
      notes?: string; 
      status?: string 
    }) => {
      const { data, error } = await supabase
        .from('shift_roster')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      toast({ title: 'Assignment updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update assignment', description: error.message, variant: 'destructive' });
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
