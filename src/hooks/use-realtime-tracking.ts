import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeTrackingState {
  isConnected: boolean;
  lastUpdate: Date | null;
  newAlertCount: number;
}

export function useRealtimeTracking(enabled: boolean = true) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [state, setState] = useState<RealtimeTrackingState>({
    isConnected: false,
    lastUpdate: null,
    newAlertCount: 0,
  });

  const acknowledgeAlerts = useCallback(() => {
    setState(prev => ({ ...prev, newAlertCount: 0 }));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let channel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      channel = supabase
        .channel('security-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'guard_tracking_history',
          },
          (payload) => {
            console.log('New guard location:', payload);
            queryClient.invalidateQueries({ queryKey: ['guard-locations'] });
            setState(prev => ({
              ...prev,
              lastUpdate: new Date(),
            }));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'geofence_alerts',
          },
          (payload) => {
            console.log('New geofence alert:', payload);
            queryClient.invalidateQueries({ queryKey: ['geofence-alerts'] });
            setState(prev => ({
              ...prev,
              lastUpdate: new Date(),
              newAlertCount: prev.newAlertCount + 1,
            }));
            
            // Show toast for new alert
            toast({
              title: '⚠️ Zone Violation Alert',
              description: `Guard left assigned zone`,
              variant: 'destructive',
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'geofence_alerts',
          },
          (payload) => {
            console.log('Alert updated:', payload);
            queryClient.invalidateQueries({ queryKey: ['geofence-alerts'] });
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shift_roster',
          },
          (payload) => {
            console.log('Roster change:', payload);
            queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
            queryClient.invalidateQueries({ queryKey: ['my-roster-assignment'] });
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
          setState(prev => ({
            ...prev,
            isConnected: status === 'SUBSCRIBED',
          }));
        });
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [enabled, queryClient, toast]);

  return {
    ...state,
    acknowledgeAlerts,
  };
}

export function useRealtimePatrols(enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('patrol-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patrol_checkpoint_logs',
        },
        (payload) => {
          console.log('Patrol checkpoint logged:', payload);
          queryClient.invalidateQueries({ queryKey: ['patrol-executions'] });
          queryClient.invalidateQueries({ queryKey: ['patrol-history'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patrol_executions',
        },
        (payload) => {
          console.log('Patrol execution updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['patrol-executions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}
