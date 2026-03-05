import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { RealtimeChannel } from "@supabase/supabase-js";

interface SecurityRealtimeState {
  isConnected: boolean;
  newEventCount: number;
  lastEventTime: Date | null;
}

export function useSecurityRealtime(enabled: boolean = true) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [state, setState] = useState<SecurityRealtimeState>({
    isConnected: false,
    newEventCount: 0,
    lastEventTime: null,
  });
  const channelRef = useRef<RealtimeChannel | null>(null);

  const acknowledgeEvents = useCallback(() => {
    setState(prev => ({ ...prev, newEventCount: 0 }));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('security-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guard_tracking_history',
        },
        () => {
          setState(prev => ({
            ...prev,
            lastEventTime: new Date(),
          }));
          queryClient.invalidateQueries({ queryKey: ['guard-locations'] });
          queryClient.invalidateQueries({ queryKey: ['security-stats'] });
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
          setState(prev => ({
            ...prev,
            newEventCount: prev.newEventCount + 1,
            lastEventTime: new Date(),
          }));
          
          queryClient.invalidateQueries({ queryKey: ['geofence-alerts'] });
          queryClient.invalidateQueries({ queryKey: ['security-stats'] });

          // Show toast for new alerts
          const alert = payload.new as any;
          if (alert.severity === 'critical' || alert.severity === 'high') {
            toast.error(
              t('security.alert.newGeofenceAlert', 'Geofence Alert'),
              {
                description: alert.alert_message || t('security.alert.guardOutsideZone', 'Guard detected outside assigned zone'),
                duration: 8000,
              }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'security_patrols',
        },
        () => {
          setState(prev => ({
            ...prev,
            lastEventTime: new Date(),
          }));
          queryClient.invalidateQueries({ queryKey: ['security-stats'] });
          queryClient.invalidateQueries({ queryKey: ['patrol-trends'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_handovers',
        },
        () => {
          setState(prev => ({
            ...prev,
            lastEventTime: new Date(),
          }));
          queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
        }
      )
      .subscribe((status) => {
        setState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED',
        }));
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, t]);

  return {
    ...state,
    acknowledgeEvents,
  };
}
