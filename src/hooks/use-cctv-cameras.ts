import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface CCTVCamera {
  id: string;
  tenant_id: string;
  camera_code: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  zone_id: string | null;
  location_description: string | null;
  latitude: number | null;
  longitude: number | null;
  floor_number: number | null;
  building: string | null;
  provider: string | null;
  model: string | null;
  ip_address: string | null;
  mac_address: string | null;
  stream_url: string | null;
  snapshot_url: string | null;
  rtsp_url: string | null;
  ptz_enabled: boolean;
  audio_enabled: boolean;
  night_vision: boolean;
  resolution: string | null;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  is_recording: boolean;
  is_motion_detection_enabled: boolean;
  last_health_check: string | null;
  last_seen_at: string | null;
  health_check_interval_minutes: number;
  installation_date: string | null;
  warranty_expiry: string | null;
  assigned_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  zone?: {
    id: string;
    zone_name: string;
  } | null;
}

export interface CCTVEvent {
  id: string;
  tenant_id: string;
  camera_id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  triggered_at: string;
  thumbnail_url: string | null;
  clip_url: string | null;
  clip_duration_seconds: number | null;
  detection_confidence: number | null;
  detection_metadata: unknown;
  linked_incident_id: string | null;
  linked_patrol_id: string | null;
  linked_alert_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  is_false_positive: boolean;
  created_at: string;
  camera?: {
    id: string;
    name: string;
    camera_code: string;
    location_description: string | null;
  } | null;
}

interface CameraFilters {
  status?: string;
  zoneId?: string;
  provider?: string;
}

export function useCCTVCameras(filters?: CameraFilters) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['cctv-cameras', tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from('cctv_cameras')
        .select(`
          *,
          zone:security_zones!zone_id(id, zone_name)
        `)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.zoneId) {
        query = query.eq('zone_id', filters.zoneId);
      }

      if (filters?.provider) {
        query = query.eq('provider', filters.provider);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as CCTVCamera[];
    },
    enabled: !!tenantId,
  });
}

export function useCCTVCamera(cameraId: string) {
  return useQuery({
    queryKey: ['cctv-camera', cameraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cctv_cameras')
        .select(`
          *,
          zone:security_zones!zone_id(id, zone_name)
        `)
        .eq('id', cameraId)
        .single();

      if (error) throw error;
      return data as unknown as CCTVCamera;
    },
    enabled: !!cameraId,
  });
}

export function useCCTVEvents(cameraId?: string, limit = 50) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['cctv-events', tenantId, cameraId, limit],
    queryFn: async () => {
      let query = supabase
        .from('cctv_events')
        .select(`
          *,
          camera:cctv_cameras!camera_id(id, name, camera_code, location_description)
        `)
        .is('deleted_at', null)
        .order('triggered_at', { ascending: false })
        .limit(limit);

      if (cameraId) {
        query = query.eq('camera_id', cameraId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as CCTVEvent[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateCamera() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (camera: { camera_code: string; name: string; [key: string]: unknown }) => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('cctv_cameras')
        .insert({ ...camera, tenant_id: tenantId } as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-cameras'] });
      toast({
        title: 'Camera Added',
        description: 'The camera has been added successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CCTVCamera> & { id: string }) => {
      const { zone, ...updateData } = updates as Record<string, unknown>;
      const { data, error } = await supabase
        .from('cctv_cameras')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cctv-cameras'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-camera', data.id] });
      toast({
        title: 'Camera Updated',
        description: 'The camera has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cameraId: string) => {
      const { error } = await supabase
        .from('cctv_cameras')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', cameraId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-cameras'] });
      toast({
        title: 'Camera Removed',
        description: 'The camera has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useReviewEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ eventId, notes, isFalsePositive }: { eventId: string; notes?: string; isFalsePositive?: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('cctv_events')
        .update({
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
          is_false_positive: isFalsePositive ?? false,
        })
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-events'] });
      toast({
        title: 'Event Reviewed',
        description: 'The event has been marked as reviewed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCameraStats() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['cctv-stats', tenantId],
    queryFn: async () => {
      const { data: cameras, error } = await supabase
        .from('cctv_cameras')
        .select('status')
        .eq('is_active', true)
        .is('deleted_at', null);

      if (error) throw error;

      const stats = {
        total: cameras.length,
        online: cameras.filter(c => c.status === 'online').length,
        offline: cameras.filter(c => c.status === 'offline').length,
        maintenance: cameras.filter(c => c.status === 'maintenance').length,
        error: cameras.filter(c => c.status === 'error').length,
        healthRate: cameras.length > 0 
          ? (cameras.filter(c => c.status === 'online').length / cameras.length) * 100 
          : 0,
      };

      return stats;
    },
    enabled: !!tenantId,
    refetchInterval: 60000,
  });
}
