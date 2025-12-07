import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sendPushNotification, addNotificationToHistory, playNotificationSound } from '@/lib/notification-history';

/**
 * Hook to listen for urgent SLA escalation broadcasts via Supabase Realtime
 * Triggers mobile push notifications for escalation level changes
 */
export function useSLAEscalationListener() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel('sla-escalation-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'corrective_actions',
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          const oldRecord = payload.old as { escalation_level?: number };
          const newRecord = payload.new as { 
            escalation_level?: number; 
            title?: string;
            priority?: string;
          };

          // Check if escalation level increased
          if (
            newRecord.escalation_level !== undefined &&
            oldRecord.escalation_level !== undefined &&
            newRecord.escalation_level > oldRecord.escalation_level
          ) {
            const level = newRecord.escalation_level;
            const title = level >= 2 
              ? '🚨 Critical SLA Escalation' 
              : '⚠️ Action Escalated';
            const body = `"${newRecord.title}" has been escalated to Level ${level}`;

            // Send push notification
            sendPushNotification(title, body, 'error');

            console.log('SLA Escalation detected:', { 
              from: oldRecord.escalation_level, 
              to: level, 
              title: newRecord.title 
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id]);
}
