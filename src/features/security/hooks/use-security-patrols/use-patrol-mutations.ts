import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
type PatrolRouteRow = Database['public']['Tables']['security_patrol_routes']['Row'];
type PatrolCheckpointRow = Database['public']['Tables']['patrol_checkpoints']['Row'];

export function useCreatePatrolRoute() {
    const queryClient = useQueryClient(); const { profile } = useAuth();
    return useMutation({
        mutationFn: async (route: Omit<PatrolRouteRow, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
            if (!profile?.tenant_id) throw new Error('No tenant');
            const { data, error } = await supabase.from('security_patrol_routes').insert({ ...route, tenant_id: profile.tenant_id }).select().single();
            if (error) throw error; return data;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['patrol-routes'] }); toast.success('Route created successfully'); },
        onError: (error) => { console.error('Failed to create route:', error); toast.error('Failed to create route'); },
    });
}

export function useUpdatePatrolRoute() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<PatrolRouteRow> & { id: string }) => {
            const { data, error } = await supabase.from('security_patrol_routes').update(updates).eq('id', id).select().single();
            if (error) throw error; return data;
        },
        onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['patrol-routes'] }); queryClient.invalidateQueries({ queryKey: ['patrol-route', data.id] }); toast.success('Route updated successfully'); },
        onError: (error) => { console.error('Failed to update route:', error); toast.error('Failed to update route'); },
    });
}

export function useStartPatrol() {
    const queryClient = useQueryClient(); const { profile } = useAuth();
    return useMutation({
        mutationFn: async ({ routeId, scheduledStart }: { routeId: string; scheduledStart?: string }) => {
            if (!profile?.tenant_id) throw new Error('No auth context');
            const { count } = await supabase.from('patrol_checkpoints').select('*', { count: 'exact', head: true }).eq('route_id', routeId).is('deleted_at', null);
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.from('security_patrols').insert({ tenant_id: profile.tenant_id, route_id: routeId, guard_id: user?.id, scheduled_start_time: scheduledStart, actual_start: new Date().toISOString(), status: 'in_progress', checkpoints_total: count || 0, checkpoints_visited: 0 }).select().single();
            if (error) throw error; return data;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['security-patrols'] }); toast.success('Patrol started'); },
        onError: (error) => { console.error('Failed to start patrol:', error); toast.error('Failed to start patrol'); },
    });
}

export function useLogCheckpoint() {
    const queryClient = useQueryClient(); const { profile } = useAuth();
    return useMutation({
        mutationFn: async ({ patrolId, checkpointId, verificationMethod, gpsLat, gpsLng, gpsAccuracy, gpsValidated, validationDistance, validationThreshold, observationNotes, photoPaths, linkedIncidentId }: { patrolId: string; checkpointId: string; verificationMethod: string; gpsLat?: number; gpsLng?: number; gpsAccuracy?: number; gpsValidated?: boolean; validationDistance?: number; validationThreshold?: number; observationNotes?: string; photoPaths?: string[]; linkedIncidentId?: string }) => {
            if (!profile?.tenant_id) throw new Error('No tenant');
            const { error: logError } = await supabase.from('patrol_checkpoint_logs').insert({ patrol_id: patrolId, checkpoint_id: checkpointId, tenant_id: profile.tenant_id, scanned_at: new Date().toISOString(), scan_method: verificationMethod, gps_latitude: gpsLat, gps_longitude: gpsLng, gps_accuracy: gpsAccuracy, gps_validated: gpsValidated, validation_distance: validationDistance, validation_threshold: validationThreshold, notes: observationNotes, photo_paths: photoPaths ? JSON.stringify(photoPaths) : null, linked_incident_id: linkedIncidentId });
            if (logError) throw logError;
            const { data: patrol } = await supabase.from('security_patrols').select('checkpoints_visited').eq('id', patrolId).single();
            await supabase.from('security_patrols').update({ checkpoints_visited: (patrol?.checkpoints_visited || 0) + 1 }).eq('id', patrolId);
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['security-patrols'] }); queryClient.invalidateQueries({ queryKey: ['security-patrol'] }); toast.success('Checkpoint logged'); },
        onError: (error) => { console.error('Failed to log checkpoint:', error); toast.error('Failed to log checkpoint'); },
    });
}

export function useCompletePatrol() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ patrolId, notes }: { patrolId: string; notes?: string }) => {
            const { error } = await supabase.from('security_patrols').update({ status: 'completed', actual_end: new Date().toISOString(), notes }).eq('id', patrolId);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['security-patrols'] }); toast.success('Patrol completed'); },
        onError: (error) => { console.error('Failed to complete patrol:', error); toast.error('Failed to complete patrol'); },
    });
}

export function useCreateCheckpoint() {
    const queryClient = useQueryClient(); const { profile } = useAuth();
    return useMutation({
        mutationFn: async (checkpoint: Omit<PatrolCheckpointRow, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
            if (!profile?.tenant_id) throw new Error('No tenant');
            const { data, error } = await supabase.from('patrol_checkpoints').insert({ ...checkpoint, tenant_id: profile.tenant_id }).select().single();
            if (error) throw error; return data;
        },
        onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['patrol-route', data.route_id] }); toast.success('Checkpoint added'); },
        onError: (error) => { console.error('Failed to add checkpoint:', error); toast.error('Failed to add checkpoint'); },
    });
}
