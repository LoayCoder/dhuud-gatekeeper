import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useGuardLocations() {
  return useQuery({
    queryKey: ['guard-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guard_tracking_history')
        .select(`
          id, guard_id, latitude, longitude, recorded_at, 
          accuracy, battery_level, is_within_zone, distance_from_zone,
          guard:profiles!guard_tracking_history_guard_id_fkey(full_name)
        `)
        .order('recorded_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      
      // Get latest position per guard (deduplicate)
      const latestByGuard = new Map<string, any>();
      (data || []).forEach((loc: any) => {
        if (!latestByGuard.has(loc.guard_id)) {
          latestByGuard.set(loc.guard_id, {
            ...loc,
            guard_name: loc.guard?.full_name || 'Unknown Guard'
          });
        }
      });
      
      return Array.from(latestByGuard.values());
    },
    refetchInterval: 15000, // Update every 15 seconds for real-time feel
  });
}

export function useGeofenceAlerts(statusFilter?: 'pending' | 'acknowledged' | 'resolved') {
  return useQuery({
    queryKey: ['geofence-alerts', statusFilter],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from('geofence_alerts')
        .select(`
          id, guard_id, alert_type, severity, guard_lat, guard_lng,
          alert_message, created_at, acknowledged_at, acknowledged_by,
          resolved_at, resolved_by, resolution_notes,
          guard:profiles!geofence_alerts_guard_id_fkey(full_name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Derive status from timestamps (no alert_status column exists)
      const enriched = (data || []).map((alert: any) => ({
        ...alert,
        status: alert.resolved_at ? 'resolved' 
              : alert.acknowledged_at ? 'acknowledged' 
              : 'pending',
        latitude: alert.guard_lat,
        longitude: alert.guard_lng,
        guard_name: alert.guard?.full_name || 'Unknown Guard'
      }));
      
      if (statusFilter) {
        return enriched.filter((a: any) => a.status === statusFilter);
      }
      return enriched;
    },
    refetchInterval: 10000, // 10 seconds for faster alert response
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('geofence_alerts')
        .update({ alert_status: 'acknowledged', acknowledged_at: new Date().toISOString(), acknowledged_by: user.id })
        .eq('id', alertId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-alerts'] });
      toast({ title: 'Alert acknowledged' });
    },
    onError: (error) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('geofence_alerts')
        .update({ alert_status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user.id, resolution_notes: notes })
        .eq('id', alertId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-alerts'] });
      toast({ title: 'Alert resolved' });
    },
    onError: (error) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useTrackMyLocation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ lat, lng, accuracy, batteryLevel }: { lat: number; lng: number; accuracy?: number; batteryLevel?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('id', user.id)
        .single();
      if (!profile) throw new Error('Profile not found');

      // Call edge function for tracking with zone compliance checking
      const { data, error } = await supabase.functions.invoke('track-guard-location', {
        body: {
          guard_id: profile.id,
          tenant_id: profile.tenant_id,
          latitude: lat,
          longitude: lng,
          accuracy: accuracy || null,
          battery_level: batteryLevel || null,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Show warning based on boundary status
      if (data) {
        if (data.boundary_warning_level === 'danger') {
          toast({
            title: 'تحذير: حدود المنطقة | Boundary Warning',
            description: `You are very close to the edge of your zone (${data.boundary_distance_meters?.toFixed(0) || '<20'}m)`,
            variant: 'destructive',
          });
        } else if (data.boundary_warning_level === 'warning') {
          toast({
            title: 'تنبيه: اقتراب من الحد | Approaching Boundary',
            description: `You are approaching the edge of your zone (${data.boundary_distance_meters?.toFixed(0) || '<50'}m)`,
          });
        } else if (!data.is_compliant) {
          toast({
            title: 'مخالفة المنطقة | Zone Violation',
            description: `You have left your assigned zone: ${data.zone_violation?.zone_name}`,
            variant: 'destructive',
          });
        }
      }
    },
    onError: (error) => {
      toast({ title: 'Failed to track', description: error.message, variant: 'destructive' });
    },
  });
}

/**
 * Hook to alert supervisor when guard's GPS is disabled
 */
export function useAlertSupervisorGpsOff() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ zoneName, reason }: { zoneName?: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('id', user.id)
        .single();
      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase.functions.invoke('alert-supervisor-gps-off', {
        body: {
          guard_id: profile.id,
          tenant_id: profile.tenant_id,
          zone_name: zoneName,
          reason,
        },
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Failed to alert supervisor:', error);
    },
  });
}
