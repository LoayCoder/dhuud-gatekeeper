import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeState {
  isConnected: boolean;
  newEventCount: number;
  lastEventTime: Date | null;
}

interface NewIncidentPayload {
  id: string;
  title: string;
  severity: string;
  event_type: string;
}

export function useDashboardRealtime(onNewEvent?: () => void) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    newEventCount: 0,
    lastEventTime: null,
  });
  const channelRef = useRef<RealtimeChannel | null>(null);

  const acknowledgeEvents = useCallback(() => {
    setState(prev => ({ ...prev, newEventCount: 0 }));
  }, []);

  const showCriticalToast = useCallback((incident: NewIncidentPayload) => {
    toast.error(
      t('hsseDashboard.realtime.criticalIncident', 'Critical Incident Reported'),
      {
        description: incident.title,
        duration: 10000,
        action: {
          label: t('hsseDashboard.realtime.viewDetails', 'View'),
          onClick: () => navigate(`/incidents/investigate?incidentId=${incident.id}`),
        },
      }
    );
  }, [t, navigate]);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incidents',
        },
        (payload) => {
          const newIncident = payload.new as NewIncidentPayload;
          
          setState(prev => ({
            ...prev,
            newEventCount: prev.newEventCount + 1,
            lastEventTime: new Date(),
          }));

          // Show toast for critical/high severity
          if (newIncident.severity === 'critical' || newIncident.severity === 'high') {
            showCriticalToast(newIncident);
          }

          onNewEvent?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'incidents',
        },
        () => {
          setState(prev => ({
            ...prev,
            lastEventTime: new Date(),
          }));
          onNewEvent?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'corrective_actions',
        },
        () => {
          setState(prev => ({
            ...prev,
            lastEventTime: new Date(),
          }));
          onNewEvent?.();
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
  }, [onNewEvent, showCriticalToast]);

  return {
    ...state,
    acknowledgeEvents,
  };
}
