import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface PTWRealtimeOptions {
  permitId?: string;
  enabled?: boolean;
}

interface RealtimeStatus {
  isConnected: boolean;
  lastUpdate: Date | null;
  newUpdatesCount: number;
}

export function usePTWRealtime(options: PTWRealtimeOptions = {}) {
  const { permitId, enabled = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [status, setStatus] = useState<RealtimeStatus>({
    isConnected: false,
    lastUpdate: null,
    newUpdatesCount: 0,
  });

  const clearNewUpdates = useCallback(() => {
    setStatus((prev) => ({ ...prev, newUpdatesCount: 0 }));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const channelName = permitId ? `ptw-permit-${permitId}` : 'ptw-permits-all';
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ptw_permits',
          ...(permitId ? { filter: `id=eq.${permitId}` } : {}),
        },
        (payload) => {
          console.log('[PTW Realtime] Permit change:', payload);
          
          setStatus((prev) => ({
            ...prev,
            lastUpdate: new Date(),
            newUpdatesCount: prev.newUpdatesCount + 1,
          }));

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['ptw-permits'] });
          if (permitId) {
            queryClient.invalidateQueries({ queryKey: ['ptw-permit', permitId] });
          }

          // Show toast for status changes
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const newStatus = (payload.new as any).status;
            const oldStatus = (payload.old as any).status;
            const reference = (payload.new as any).reference_id;
            
            if (newStatus !== oldStatus && reference) {
              toast({
                title: t('ptw.realtime.statusChanged', 'Permit {{reference}} status changed to {{status}}', {
                  reference,
                  status: newStatus,
                }),
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ptw_signatures',
          ...(permitId ? { filter: `permit_id=eq.${permitId}` } : {}),
        },
        (payload) => {
          console.log('[PTW Realtime] New signature:', payload);
          
          setStatus((prev) => ({
            ...prev,
            lastUpdate: new Date(),
            newUpdatesCount: prev.newUpdatesCount + 1,
          }));

          // Invalidate permit queries to refresh signature data
          if (permitId) {
            queryClient.invalidateQueries({ queryKey: ['ptw-permit', permitId] });
          }
          queryClient.invalidateQueries({ queryKey: ['ptw-signatures'] });
        }
      )
      .subscribe((subscriptionStatus) => {
        console.log('[PTW Realtime] Subscription status:', subscriptionStatus);
        setStatus((prev) => ({
          ...prev,
          isConnected: subscriptionStatus === 'SUBSCRIBED',
        }));
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, permitId, queryClient, toast, t]);

  return {
    ...status,
    clearNewUpdates,
  };
}
