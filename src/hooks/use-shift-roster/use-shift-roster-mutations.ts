import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { eachDayOfInterval, parseISO, format, getDay } from 'date-fns';
import type { CreateRosterAssignmentParams, AssignTeamToShiftParams } from './types';

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
        mutationFn: async (params: AssignTeamToShiftParams) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();
            if (!profile?.tenant_id) throw new Error('No tenant found');

            // Fetch team members
            const { data: teamMembers, error: membersError } = await supabase
                .from('security_team_members')
                .select('guard_id')
                .eq('team_id', params.team_id)
                .eq('tenant_id', profile.tenant_id)
                .is('deleted_at', null);

            if (membersError) throw membersError;
            if (!teamMembers?.length) throw new Error('No members in team');

            // Fetch team supervisor
            const { data: team } = await supabase
                .from('security_teams')
                .select('supervisor_id')
                .eq('id', params.team_id)
                .single();

            // Generate dates in range, excluding off days
            const dates = eachDayOfInterval({
                start: parseISO(params.start_date),
                end: parseISO(params.end_date)
            }).filter(date => !params.excluded_days?.includes(getDay(date)));

            if (dates.length === 0) {
                throw new Error('No valid dates after excluding off days');
            }

            const now = new Date().toISOString();
            const entries = dates.flatMap(date =>
                teamMembers.map(member => ({
                    guard_id: member.guard_id,
                    zone_id: params.zone_id,
                    shift_id: params.shift_id,
                    supervisor_id: team?.supervisor_id || null,
                    roster_date: format(date, 'yyyy-MM-dd'),
                    assigned_at: now,
                    tenant_id: profile.tenant_id,
                    status: 'scheduled',
                }))
            );

            const { error } = await supabase.from('shift_roster').insert(entries);
            if (error) throw error;

            return {
                count: entries.length,
                members: teamMembers.length,
                days: dates.length
            };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
            queryClient.invalidateQueries({ queryKey: ['my-upcoming-shifts'] });
            toast({
                title: `${result.members} guards assigned for ${result.days} day(s)`,
                description: `Total ${result.count} roster entries created`
            });
        },
        onError: (error) => {
            toast({ title: 'Failed to assign team', description: error.message, variant: 'destructive' });
        },
    });
}
