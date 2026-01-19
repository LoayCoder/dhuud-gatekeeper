import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { eachDayOfInterval, parseISO, format, getDay, differenceInHours } from 'date-fns';

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
  acknowledged_at: string | null;
  assigned_at: string | null;
  auto_acknowledged: boolean | null;
  guard?: { full_name: string | null };
  supervisor?: { full_name: string | null };
  zone?: { zone_name: string | null; zone_code: string | null };
  shift?: { shift_name: string | null; start_time: string | null; end_time: string | null };
}

export interface UpcomingShift {
  id: string;
  roster_date: string;
  status: string | null;
  acknowledged_at: string | null;
  assigned_at: string | null;
  auto_acknowledged: boolean | null;
  zone: { zone_name: string | null; zone_code: string | null } | null;
  shift: { shift_name: string | null; start_time: string | null; end_time: string | null } | null;
  supervisor: { full_name: string | null } | null;
}

export function useShiftRoster(filters?: { date?: string; zoneId?: string; shiftId?: string }) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['shift-roster', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('shift_roster')
        .select(`
          id, guard_id, zone_id, shift_id, roster_date, supervisor_id, status, notes,
          check_in_time, check_out_time, check_in_lat, check_in_lng, check_out_lat, check_out_lng,
          acknowledged_at, assigned_at, auto_acknowledged,
          guard:profiles!shift_roster_guard_id_fkey(full_name),
          supervisor:profiles!shift_roster_supervisor_id_fkey(full_name),
          zone:security_zones(zone_name, zone_code),
          shift:security_shifts(shift_name, start_time, end_time)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('roster_date', { ascending: false });

      if (filters?.date) query = query.eq('roster_date', filters.date);
      if (filters?.zoneId) query = query.eq('zone_id', filters.zoneId);
      if (filters?.shiftId) query = query.eq('shift_id', filters.shiftId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RosterAssignment[];
    },
    enabled: !!tenantId,
  });
}

export function useMyRosterAssignment() {
  return useQuery({
    queryKey: ['my-roster-assignment'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const today = new Date().toISOString().split('T')[0];
      
      // First: Try to get today's assignment
      const { data: todayAssignment, error: todayError } = await supabase
        .from('shift_roster')
        .select(`
          id, guard_id, zone_id, shift_id, roster_date, supervisor_id, status, notes,
          check_in_time, check_out_time, acknowledged_at, assigned_at, auto_acknowledged,
          supervisor:profiles!shift_roster_supervisor_id_fkey(full_name, phone_number),
          zone:security_zones(zone_name, zone_code),
          shift:security_shifts(shift_name, start_time, end_time)
        `)
        .eq('guard_id', user.id)
        .eq('roster_date', today)
        .is('deleted_at', null)
        .maybeSingle();

      if (todayError) throw todayError;
      if (todayAssignment) return todayAssignment;
      
      // Fallback: Check for any active (checked_in) assignment from previous days
      const { data: activeAssignment, error: activeError } = await supabase
        .from('shift_roster')
        .select(`
          id, guard_id, zone_id, shift_id, roster_date, supervisor_id, status, notes,
          check_in_time, check_out_time, acknowledged_at, assigned_at, auto_acknowledged,
          supervisor:profiles!shift_roster_supervisor_id_fkey(full_name, phone_number),
          zone:security_zones(zone_name, zone_code),
          shift:security_shifts(shift_name, start_time, end_time)
        `)
        .eq('guard_id', user.id)
        .eq('status', 'checked_in')
        .is('deleted_at', null)
        .order('roster_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeError) throw activeError;
      return activeAssignment;
    },
  });
}

export function useMyUpcomingShifts() {
  return useQuery({
    queryKey: ['my-upcoming-shifts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('shift_roster')
        .select(`
          id, roster_date, status, acknowledged_at, assigned_at, auto_acknowledged,
          zone:security_zones(zone_name, zone_code),
          shift:security_shifts(shift_name, start_time, end_time),
          supervisor:profiles!shift_roster_supervisor_id_fkey(full_name)
        `)
        .eq('guard_id', user.id)
        .gte('roster_date', today)
        .is('deleted_at', null)
        .order('roster_date', { ascending: true })
        .limit(30);

      if (error) throw error;
      return (data || []) as UpcomingShift[];
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
      let roster = null;
      const { data: todayRoster } = await supabase
        .from('shift_roster')
        .select(`
          supervisor_id,
          supervisor:profiles!shift_roster_supervisor_id_fkey(id, full_name, phone_number)
        `)
        .eq('guard_id', user.id)
        .eq('roster_date', today)
        .is('deleted_at', null)
        .maybeSingle();
      
      roster = todayRoster;

      // 1b. Fallback to active (checked_in) roster from previous days
      if (!roster) {
        const { data: activeRoster } = await supabase
          .from('shift_roster')
          .select(`
            supervisor_id,
            supervisor:profiles!shift_roster_supervisor_id_fkey(id, full_name, phone_number)
          `)
          .eq('guard_id', user.id)
          .eq('status', 'checked_in')
          .is('deleted_at', null)
          .order('roster_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        roster = activeRoster;
      }

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

export interface CreateRosterAssignmentParams {
  guard_id: string;
  zone_id: string;
  shift_id: string;
  start_date: string;
  end_date: string;
  excluded_days?: number[]; // 0=Sunday, 5=Friday, 6=Saturday
  supervisor_id?: string;
  notes?: string;
  status?: string;
}

export function useCreateRosterAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assignment: CreateRosterAssignmentParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) throw new Error('No tenant found');

      // Generate dates in range, excluding off days
      const dates = eachDayOfInterval({
        start: parseISO(assignment.start_date),
        end: parseISO(assignment.end_date)
      }).filter(date => !assignment.excluded_days?.includes(getDay(date)));

      if (dates.length === 0) {
        throw new Error('No valid dates after excluding off days');
      }

      const now = new Date().toISOString();
      const entries = dates.map(date => ({
        guard_id: assignment.guard_id,
        zone_id: assignment.zone_id,
        shift_id: assignment.shift_id,
        supervisor_id: assignment.supervisor_id || null,
        roster_date: format(date, 'yyyy-MM-dd'),
        assigned_at: now,
        tenant_id: profile.tenant_id,
        status: assignment.status || 'scheduled',
        notes: assignment.notes || null,
      }));

      const { error } = await supabase.from('shift_roster').insert(entries);
      if (error) throw error;
      
      return { count: entries.length, guard_id: assignment.guard_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      queryClient.invalidateQueries({ queryKey: ['my-upcoming-shifts'] });
      toast({ title: `${result.count} shift(s) assigned successfully` });
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

export function useBulkDeleteRosterAssignments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('shift_roster')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      toast({ title: `${result.count} assignments deleted` });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete assignments', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkUpdateRosterAssignments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ids, updates }: { 
      ids: string[]; 
      updates: { zone_id?: string; shift_id?: string; supervisor_id?: string } 
    }) => {
      const { error } = await supabase
        .from('shift_roster')
        .update(updates)
        .in('id', ids);
      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      toast({ title: `${result.count} assignments updated` });
    },
    onError: (error) => {
      toast({ title: 'Failed to update assignments', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAcknowledgeShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shift_roster')
        .update({ 
          acknowledged_at: new Date().toISOString(),
          auto_acknowledged: false
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-upcoming-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['my-roster-assignment'] });
      toast({ title: 'Shift acknowledged' });
    },
    onError: (error) => {
      toast({ title: 'Failed to acknowledge shift', description: error.message, variant: 'destructive' });
    },
  });
}

export function getAcknowledgmentStatus(shift: { 
  acknowledged_at: string | null; 
  assigned_at: string | null; 
  auto_acknowledged: boolean | null;
}): 'acknowledged' | 'auto_acknowledged' | 'pending' | 'expired' {
  if (shift.acknowledged_at) {
    return shift.auto_acknowledged ? 'auto_acknowledged' : 'acknowledged';
  }
  
  if (shift.assigned_at) {
    const hoursSinceAssigned = differenceInHours(new Date(), new Date(shift.assigned_at));
    if (hoursSinceAssigned >= 12) {
      return 'expired'; // Should be auto-acknowledged by edge function
    }
  }
  
  return 'pending';
}

export function getTimeUntilAutoAcknowledge(assignedAt: string | null): number | null {
  if (!assignedAt) return null;
  const hoursRemaining = 12 - differenceInHours(new Date(), new Date(assignedAt));
  return hoursRemaining > 0 ? hoursRemaining : 0;
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
