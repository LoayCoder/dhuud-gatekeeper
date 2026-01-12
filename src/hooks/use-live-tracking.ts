import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useGuardLocations() {
  return useQuery({
    queryKey: ['guard-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guard_tracking_history')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
}

export function useGeofenceAlerts(statusFilter?: string) {
  return useQuery({
    queryKey: ['geofence-alerts', statusFilter],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from('geofence_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (statusFilter) {
        return (data || []).filter((a: any) => a.alert_status === statusFilter);
      }
      return data || [];
    },
    refetchInterval: 15000,
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
