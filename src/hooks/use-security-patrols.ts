import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

// Use database types directly
type PatrolRouteRow = Database['public']['Tables']['security_patrol_routes']['Row'];
type PatrolCheckpointRow = Database['public']['Tables']['patrol_checkpoints']['Row'];
type SecurityPatrolRow = Database['public']['Tables']['security_patrols']['Row'];
type PatrolCheckpointLogRow = Database['public']['Tables']['patrol_checkpoint_logs']['Row'];

export type PatrolRoute = PatrolRouteRow;
export type PatrolCheckpoint = PatrolCheckpointRow;
export type SecurityPatrol = SecurityPatrolRow & {
  route?: { name: string } | null;
  guard?: { full_name: string } | null;
};
export type PatrolCheckpointLog = PatrolCheckpointLogRow;

export function usePatrolRoutes() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['patrol-routes', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('security_patrol_routes')
        .select(`
          *,
          checkpoints:patrol_checkpoints(count)
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function usePatrolRoute(id: string | undefined) {
  return useQuery({
    queryKey: ['patrol-route', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('security_patrol_routes')
        .select(`
          *,
          checkpoints:patrol_checkpoints(*)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePatrolRoute() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (route: Omit<PatrolRouteRow, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('security_patrol_routes')
        .insert({ ...route, tenant_id: profile.tenant_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-routes'] });
      toast.success('Route created successfully');
    },
    onError: (error) => {
      console.error('Failed to create route:', error);
      toast.error('Failed to create route');
    },
  });
}

export function useUpdatePatrolRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PatrolRouteRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('security_patrol_routes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patrol-routes'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-route', data.id] });
      toast.success('Route updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update route:', error);
      toast.error('Failed to update route');
    },
  });
}

export function useSecurityPatrols(filters: { status?: string; routeId?: string } = {}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['security-patrols', filters, profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('security_patrols')
        .select('*, route:security_patrol_routes(name), guard:profiles!security_patrols_guard_id_fkey(full_name)')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.routeId) {
        query = query.eq('route_id', filters.routeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useSecurityPatrol(id: string | undefined) {
  return useQuery({
    queryKey: ['security-patrol', id],
    queryFn: async () => {
      if (!id) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('security_patrols')
        .select('*, route:security_patrol_routes(*, checkpoints:patrol_checkpoints(*)), guard:profiles!security_patrols_guard_id_fkey(full_name), logs:patrol_checkpoint_logs(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useStartPatrol() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ routeId, scheduledStart }: { routeId: string; scheduledStart?: string }) => {
      if (!profile?.tenant_id) throw new Error('No auth context');

      // Get route checkpoint count
      const { count } = await supabase
        .from('patrol_checkpoints')
        .select('*', { count: 'exact', head: true })
        .eq('route_id', routeId)
        .is('deleted_at', null);

      // Get current user id from supabase auth
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('security_patrols')
        .insert({
          tenant_id: profile.tenant_id,
          route_id: routeId,
          guard_id: user?.id,
          scheduled_start_time: scheduledStart,
          actual_start: new Date().toISOString(),
          status: 'in_progress',
          checkpoints_total: count || 0,
          checkpoints_visited: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-patrols'] });
      toast.success('Patrol started');
    },
    onError: (error) => {
      console.error('Failed to start patrol:', error);
      toast.error('Failed to start patrol');
    },
  });
}

export function useLogCheckpoint() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      patrolId,
      checkpointId,
      verificationMethod,
      gpsLat,
      gpsLng,
      gpsAccuracy,
      gpsValidated,
      validationDistance,
      validationThreshold,
      observationNotes,
      photoPaths,
      linkedIncidentId,
    }: {
      patrolId: string;
      checkpointId: string;
      verificationMethod: string;
      gpsLat?: number;
      gpsLng?: number;
      gpsAccuracy?: number;
      gpsValidated?: boolean;
      validationDistance?: number;
      validationThreshold?: number;
      observationNotes?: string;
      photoPaths?: string[];
      linkedIncidentId?: string;
    }) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      // Log the checkpoint with enhanced GPS validation data
      const { error: logError } = await supabase
        .from('patrol_checkpoint_logs')
        .insert({
          patrol_id: patrolId,
          checkpoint_id: checkpointId,
          tenant_id: profile.tenant_id,
          scanned_at: new Date().toISOString(),
          scan_method: verificationMethod,
          gps_latitude: gpsLat,
          gps_longitude: gpsLng,
          gps_accuracy: gpsAccuracy,
          gps_validated: gpsValidated,
          validation_distance: validationDistance,
          validation_threshold: validationThreshold,
          notes: observationNotes,
          photo_paths: photoPaths ? JSON.stringify(photoPaths) : null,
          linked_incident_id: linkedIncidentId,
        });

      if (logError) throw logError;

      // Update patrol progress - increment checkpoints_visited
      const { data: patrol } = await supabase
        .from('security_patrols')
        .select('checkpoints_visited')
        .eq('id', patrolId)
        .single();

      await supabase
        .from('security_patrols')
        .update({ checkpoints_visited: (patrol?.checkpoints_visited || 0) + 1 })
        .eq('id', patrolId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-patrols'] });
      queryClient.invalidateQueries({ queryKey: ['security-patrol'] });
      toast.success('Checkpoint logged');
    },
    onError: (error) => {
      console.error('Failed to log checkpoint:', error);
      toast.error('Failed to log checkpoint');
    },
  });
}

export function useCompletePatrol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patrolId, notes }: { patrolId: string; notes?: string }) => {
      const { error } = await supabase
        .from('security_patrols')
        .update({
          status: 'completed',
          actual_end: new Date().toISOString(),
          notes,
        })
        .eq('id', patrolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-patrols'] });
      toast.success('Patrol completed');
    },
    onError: (error) => {
      console.error('Failed to complete patrol:', error);
      toast.error('Failed to complete patrol');
    },
  });
}

export function useCreateCheckpoint() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (checkpoint: Omit<PatrolCheckpointRow, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('patrol_checkpoints')
        .insert({ ...checkpoint, tenant_id: profile.tenant_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patrol-route', data.route_id] });
      toast.success('Checkpoint added');
    },
    onError: (error) => {
      console.error('Failed to add checkpoint:', error);
      toast.error('Failed to add checkpoint');
    },
  });
}
