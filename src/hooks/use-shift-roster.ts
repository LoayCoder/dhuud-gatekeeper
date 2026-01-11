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
          supervisor:profiles!shift_roster_supervisor_id_fkey(full_name, phone_number),
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

export function useMySupervisor() {
  return useQuery({
    queryKey: ['my-supervisor'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const today = new Date().toISOString().split('T')[0];

      // 1. Try to get supervisor from today's roster assignment
      const { data: roster } = await supabase
        .from('shift_roster')
        .select(`
          supervisor_id,
          supervisor:profiles!shift_roster_supervisor_id_fkey(id, full_name, phone_number)
        `)
        .eq('guard_id', user.id)
        .eq('roster_date', today)
        .is('deleted_at', null)
        .maybeSingle();

      if (roster?.supervisor) {
        const sup = roster.supervisor as { id: string; full_name: string | null; phone_number: string | null };
        return { id: sup.id, full_name: sup.full_name, phone_number: sup.phone_number };
      }

      // 2. Fallback: Get supervisor from security team membership
      const { data: teamMembership } = await supabase
        .from('security_team_members')
        .select(`
          team:security_teams!inner(
            supervisor_id,
            supervisor:profiles!security_teams_supervisor_id_fkey(id, full_name, phone_number)
          )
        `)
        .eq('guard_id', user.id)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

      if (teamMembership?.team) {
        const team = teamMembership.team as { supervisor_id: string | null; supervisor: { id: string; full_name: string | null; phone_number: string | null } | null };
        if (team.supervisor) {
          return { id: team.supervisor.id, full_name: team.supervisor.full_name, phone_number: team.supervisor.phone_number };
        }
      }

      return null;
    },
  });
}

export function useSupervisors() {
  return useQuery({
    queryKey: ['security-supervisors'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tenant_supervisors');

      if (error) {
        console.error('Error fetching supervisors:', error);
        return [];
      }

      return (data || []).map((s: { id: string; full_name: string | null; role_code: string }) => ({
        id: s.id,
        full_name: s.full_name || 'Unknown',
        role: s.role_code
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
      const { error } = await supabase.rpc('guard_check_in', {
        p_roster_id: id,
        p_lat: lat,
        p_lng: lng
      });
      if (error) throw error;
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
      const { error } = await supabase.rpc('guard_check_out', {
        p_roster_id: id,
        p_lat: lat,
        p_lng: lng
      });
      if (error) throw error;
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

export function useAssignTeamToShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      team_id: string;
      zone_id: string;
      shift_id: string;
      roster_date: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) throw new Error('No tenant found');

      // Fetch team with supervisor
      const { data: team, error: teamError } = await supabase
        .from('security_teams')
        .select('id, supervisor_id')
        .eq('id', data.team_id)
        .single();

      if (teamError) throw teamError;

      // Fetch team members
      const { data: members, error: membersError } = await supabase
        .from('security_team_members')
        .select('guard_id')
        .eq('team_id', data.team_id)
        .is('deleted_at', null);

      if (membersError) throw membersError;
      if (!members || members.length === 0) throw new Error('No team members found');

      // Create roster entries for each member
      const rosterEntries = members.map(m => ({
        guard_id: m.guard_id,
        zone_id: data.zone_id,
        shift_id: data.shift_id,
        roster_date: data.roster_date,
        supervisor_id: team.supervisor_id,
        tenant_id: profile.tenant_id,
        status: 'scheduled',
      }));

      const { error: insertError } = await supabase
        .from('shift_roster')
        .insert(rosterEntries);

      if (insertError) throw insertError;

      return { count: members.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      toast({ title: `${result.count} team members assigned to shift` });
    },
    onError: (error) => {
      toast({ title: 'Failed to assign team', description: error.message, variant: 'destructive' });
    },
  });
}
