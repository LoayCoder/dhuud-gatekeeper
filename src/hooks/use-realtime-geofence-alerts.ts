import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { playAlertSound } from '@/lib/alert-sounds';
import { logger } from '@/lib/logger';

interface GeofenceAlert {
  id: string;
  guard_id: string;
  guard_name: string;
  alert_type: string;
  severity: string;
  latitude: number;
  longitude: number;
  alert_message: string | null;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  status: 'pending' | 'acknowledged' | 'resolved';
}

interface UseRealtimeGeofenceAlertsOptions {
  enabled?: boolean;
}

interface RealtimeGeofenceAlertsReturn {
  pendingAlerts: GeofenceAlert[];
  acknowledgedAlerts: GeofenceAlert[];
  resolvedAlerts: GeofenceAlert[];
  allAlerts: GeofenceAlert[];
  isLoading: boolean;
  isConnected: boolean;
  newAlertCount: number;
  clearNewAlertCount: () => void;
  acknowledgeAlert: ReturnType<typeof useMutation>;
  resolveAlert: ReturnType<typeof useMutation>;
}

function enrichAlert(rawAlert: any): GeofenceAlert {
  return {
    ...rawAlert,
    status: rawAlert.resolved_at ? 'resolved' 
          : rawAlert.acknowledged_at ? 'acknowledged' 
          : 'pending',
    latitude: rawAlert.guard_lat,
    longitude: rawAlert.guard_lng,
    guard_name: rawAlert.guard?.full_name || rawAlert.guard_name || 'Unknown Guard',
  };
}

function getAlertTitle(alertType: string): string {
  const titles: Record<string, string> = {
    'zone_violation': '🚨 Zone Violation',
    'boundary_breach': '⚠️ Boundary Breach',
    'gps_disabled': '📍 GPS Disabled',
    'no_check_in': '⏰ Missing Check-in',
    'panic_alert': '🆘 PANIC ALERT',
    'battery_low': '🔋 Low Battery',
  };
  return titles[alertType] || `⚠️ ${alertType}`;
}

export function useRealtimeGeofenceAlerts(
  options: UseRealtimeGeofenceAlertsOptions = {}
): RealtimeGeofenceAlertsReturn {
  const { enabled = true } = options;
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [newAlertCount, setNewAlertCount] = useState(0);

  // Initial data fetch (NO POLLING)
  const { data: initialAlerts, isLoading } = useQuery({
    queryKey: ['geofence-alerts-realtime-initial'],
    queryFn: async (): Promise<GeofenceAlert[]> => {
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
        .limit(100);
      
      if (error) throw error;
      return (data || []).map(enrichAlert);
    },
    refetchInterval: false, // NO POLLING - realtime only
    staleTime: Infinity,
    enabled,
  });

  // Initialize state from initial fetch
  useEffect(() => {
    if (initialAlerts) {
      setAlerts(initialAlerts);
    }
  }, [initialAlerts]);

  // Clear new alert count
  const clearNewAlertCount = useCallback(() => {
    setNewAlertCount(0);
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('geofence-alerts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'geofence_alerts' },
        async (payload) => {
          logger.debug('[Realtime Alerts] New alert:', payload);
          
          // Fetch full alert with guard info
          const { data } = await supabase
            .from('geofence_alerts')
            .select(`
              id, guard_id, alert_type, severity, guard_lat, guard_lng,
              alert_message, created_at, acknowledged_at, acknowledged_by,
              resolved_at, resolved_by, resolution_notes,
              guard:profiles!geofence_alerts_guard_id_fkey(full_name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const newAlert = enrichAlert(data);
            
            // INSTANT update - add new alert to state
            setAlerts(prev => [newAlert, ...prev.filter(a => a.id !== newAlert.id)]);
            setNewAlertCount(prev => prev + 1);

            // Show toast notification
            toast({
              title: getAlertTitle(newAlert.alert_type),
              description: `${newAlert.guard_name}: ${newAlert.alert_message || t('security.alerts.newAlert', 'New alert detected')}`,
              variant: 'destructive',
            });

            // Play alert sound
            playAlertSound(newAlert.severity);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'geofence_alerts' },
        (payload) => {
          logger.debug('[Realtime Alerts] Alert updated:', payload);
          
          // INSTANT update - modify alert in state
          setAlerts(prev => prev.map(alert => 
            alert.id === payload.new.id ? enrichAlert({ ...alert, ...payload.new }) : alert
          ));
        }
      )
      .subscribe((status) => {
        logger.debug('[Realtime Alerts] Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, toast, t]);

  // Acknowledge alert mutation with optimistic update
  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('geofence_alerts')
        .update({ 
          acknowledged_at: new Date().toISOString(), 
          acknowledged_by: user.id 
        })
        .eq('id', alertId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async (alertId) => {
      // INSTANT: Optimistic update
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? { ...alert, acknowledged_at: new Date().toISOString(), status: 'acknowledged' as const }
          : alert
      ));
    },
    onSuccess: () => {
      toast({ title: t('security.alerts.acknowledged', 'Alert acknowledged') });
    },
    onError: (error, alertId) => {
      // Rollback on error - refetch to get correct state
      queryClient.invalidateQueries({ queryKey: ['geofence-alerts-realtime-initial'] });
      toast({ 
        title: t('common.error', 'Error'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Resolve alert mutation with optimistic update
  const resolveAlert = useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('geofence_alerts')
        .update({ 
          resolved_at: new Date().toISOString(), 
          resolved_by: user.id,
          resolution_notes: notes
        })
        .eq('id', alertId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async ({ alertId, notes }) => {
      // INSTANT: Optimistic update
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? { 
              ...alert, 
              resolved_at: new Date().toISOString(), 
              resolution_notes: notes,
              status: 'resolved' as const 
            }
          : alert
      ));
    },
    onSuccess: () => {
      toast({ title: t('security.alerts.resolved', 'Alert resolved') });
    },
    onError: (error) => {
      // Rollback on error - refetch to get correct state
      queryClient.invalidateQueries({ queryKey: ['geofence-alerts-realtime-initial'] });
      toast({ 
        title: t('common.error', 'Error'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Filter alerts by status
  const pendingAlerts = useMemo(() => 
    alerts.filter(a => a.status === 'pending'), [alerts]);
  
  const acknowledgedAlerts = useMemo(() => 
    alerts.filter(a => a.status === 'acknowledged'), [alerts]);
  
  const resolvedAlerts = useMemo(() => 
    alerts.filter(a => a.status === 'resolved'), [alerts]);

  return {
    pendingAlerts,
    acknowledgedAlerts,
    resolvedAlerts,
    allAlerts: alerts,
    isLoading,
    isConnected,
    newAlertCount,
    clearNewAlertCount,
    acknowledgeAlert,
    resolveAlert,
  };
}
