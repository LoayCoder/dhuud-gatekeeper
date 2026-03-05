import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import type { RosterAssignment, UpcomingShift } from './types';

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
