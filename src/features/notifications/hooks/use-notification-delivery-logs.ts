import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { NotificationChannel } from '@/components/notifications/ChannelIcon';
import type { DeliveryStatus } from '@/components/notifications/DeliveryStatusBadge';

export type NotificationSource = 'manual' | 'incident' | 'hsse' | 'all';

export interface UnifiedNotificationLog {
  id: string;
  source: 'manual' | 'incident' | 'hsse';
  channel: NotificationChannel;
  recipient: string;
  subject_or_event: string;
  status: DeliveryStatus;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  // Incident-specific metadata
  severity_level?: string;
  stakeholder_role?: string;
  event_type?: string;
  event_id?: string;
  was_erp_override?: boolean;
  // Manual-specific metadata
  template_name?: string;
  provider?: string;
  provider_message_id?: string;
  delivered_at?: string | null;
  read_at?: string | null;
  is_final?: boolean;
  webhook_events?: unknown[];
  // HSSE-specific metadata
  recipient_type?: 'employee' | 'worker' | 'visitor';
  recipient_name?: string;
  recipient_language?: string;
  hsse_priority?: string;
  hsse_category?: string;
  notification_title?: string;
}

export interface DeliveryLogStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  byChannel: Record<string, number>;
  successRate: number;
}

interface UseNotificationDeliveryLogsOptions {
  channelFilter?: string;
  statusFilter?: string;
  sourceFilter?: NotificationSource;
  searchQuery?: string;
  limit?: number;
}

export function useNotificationDeliveryLogs(options: UseNotificationDeliveryLogsOptions = {}) {
  const {
    channelFilter = 'all',
    statusFilter = 'all',
    sourceFilter = 'all',
    searchQuery = '',
    limit = 100,
  } = options;

  const [logs, setLogs] = useState<UnifiedNotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DeliveryLogStats>({
    total: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    byChannel: {},
    successRate: 0,
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const results: UnifiedNotificationLog[] = [];

      // Fetch from notification_logs (manual notifications)
      if (sourceFilter === 'all' || sourceFilter === 'manual') {
        let manualQuery = supabase
          .from('notification_logs')
          .select('id, channel, provider, provider_message_id, to_address, template_name, subject, status, is_final, error_message, created_at, sent_at, delivered_at, read_at, webhook_events')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (channelFilter !== 'all') {
          manualQuery = manualQuery.eq('channel', channelFilter);
        }
        if (statusFilter !== 'all') {
          manualQuery = manualQuery.eq('status', statusFilter);
        }
        if (searchQuery) {
          manualQuery = manualQuery.ilike('to_address', `%${searchQuery}%`);
        }

        const { data: manualData, error: manualError } = await manualQuery;

        if (manualError) {
          console.error('Error fetching notification_logs:', manualError);
        } else if (manualData) {
          const normalizedManual: UnifiedNotificationLog[] = manualData.map((log) => ({
            id: log.id,
            source: 'manual' as const,
            channel: (log.channel || 'email') as NotificationChannel,
            recipient: log.to_address || '',
            subject_or_event: log.subject || log.template_name || '-',
            status: (log.status || 'pending') as DeliveryStatus,
            error_message: log.error_message,
            created_at: log.created_at || '',
            sent_at: log.sent_at,
            template_name: log.template_name,
            provider: log.provider,
            provider_message_id: log.provider_message_id,
            delivered_at: log.delivered_at,
            read_at: log.read_at,
            is_final: log.is_final,
            webhook_events: (log.webhook_events || []) as unknown[],
          }));
          results.push(...normalizedManual);
        }
      }

      // Fetch from auto_notification_logs (incident notifications)
      if (sourceFilter === 'all' || sourceFilter === 'incident') {
        let incidentQuery = supabase
          .from('auto_notification_logs')
          .select('id, channel, recipient_phone, status, error_message, created_at, sent_at, severity_level, stakeholder_role, event_type, event_id, was_erp_override, provider_message_id')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (channelFilter !== 'all') {
          incidentQuery = incidentQuery.eq('channel', channelFilter);
        }
        if (statusFilter !== 'all') {
          incidentQuery = incidentQuery.eq('status', statusFilter);
        }
        if (searchQuery) {
          incidentQuery = incidentQuery.ilike('recipient_phone', `%${searchQuery}%`);
        }

        const { data: incidentData, error: incidentError } = await incidentQuery;

        if (incidentError) {
          console.error('Error fetching auto_notification_logs:', incidentError);
        } else if (incidentData) {
          const normalizedIncident: UnifiedNotificationLog[] = incidentData.map((log) => ({
            id: log.id,
            source: 'incident' as const,
            channel: (log.channel || 'whatsapp') as NotificationChannel,
            recipient: log.recipient_phone || '',
            subject_or_event: log.event_type ? `${log.event_type} (${log.severity_level || 'N/A'})` : 'Incident Alert',
            status: (log.status || 'pending') as DeliveryStatus,
            error_message: log.error_message,
            created_at: log.created_at || '',
            sent_at: log.sent_at,
            severity_level: log.severity_level,
            stakeholder_role: log.stakeholder_role,
            event_type: log.event_type,
            event_id: log.event_id,
            was_erp_override: log.was_erp_override,
            provider_message_id: log.provider_message_id,
          }));
          results.push(...normalizedIncident);
        }
      }

      // Fetch from hsse_notification_delivery_logs (HSSE notifications)
      if (sourceFilter === 'all' || sourceFilter === 'hsse') {
        let hsseQuery = supabase
          .from('hsse_notification_delivery_logs')
          .select(`
            id, tenant_id, notification_id, channel, recipient_type, 
            recipient_address, recipient_name, recipient_language,
            status, provider, provider_message_id, error_message,
            sent_at, delivered_at, failed_at, created_at, metadata
          `)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (channelFilter !== 'all') {
          hsseQuery = hsseQuery.eq('channel', channelFilter);
        }
        if (statusFilter !== 'all') {
          hsseQuery = hsseQuery.eq('status', statusFilter);
        }
        if (searchQuery) {
          hsseQuery = hsseQuery.ilike('recipient_address', `%${searchQuery}%`);
        }

        const { data: hsseData, error: hsseError } = await hsseQuery;

        if (hsseError) {
          console.error('Error fetching hsse_notification_delivery_logs:', hsseError);
        } else if (hsseData) {
          const normalizedHSSE: UnifiedNotificationLog[] = hsseData.map((log) => {
            const metadata = (log.metadata || {}) as Record<string, unknown>;
            return {
              id: log.id,
              source: 'hsse' as const,
              channel: (log.channel || 'email') as NotificationChannel,
              recipient: log.recipient_address || '',
              subject_or_event: 'HSSE Alert',
              status: (log.status || 'pending') as DeliveryStatus,
              error_message: log.error_message,
              created_at: log.created_at || '',
              sent_at: log.sent_at,
              delivered_at: log.delivered_at,
              recipient_type: log.recipient_type as 'employee' | 'worker' | 'visitor',
              recipient_name: log.recipient_name,
              recipient_language: log.recipient_language,
              hsse_priority: metadata.priority as string | undefined,
              hsse_category: metadata.category as string | undefined,
              provider: log.provider,
              provider_message_id: log.provider_message_id,
            };
          });
          results.push(...normalizedHSSE);
        }
      }

      // Sort combined results by created_at
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Calculate stats
      const channelCounts: Record<string, number> = {};
      let sent = 0, delivered = 0, failed = 0, pending = 0;

      results.forEach((log) => {
        channelCounts[log.channel] = (channelCounts[log.channel] || 0) + 1;
        
        if (log.status === 'sent') sent++;
        else if (log.status === 'delivered' || log.status === 'read') delivered++;
        else if (log.status === 'failed' || log.status === 'bounced' || log.status === 'complained') failed++;
        else if (log.status === 'pending') pending++;
      });

      const total = results.length;
      const successRate = total > 0 ? ((sent + delivered) / total) * 100 : 0;

      setStats({
        total,
        sent,
        delivered,
        failed,
        pending,
        byChannel: channelCounts,
        successRate,
      });

      setLogs(results.slice(0, limit));
    } finally {
      setLoading(false);
    }
  }, [channelFilter, statusFilter, sourceFilter, searchQuery, limit]);

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime updates for all tables
    const channel1 = supabase
      .channel('notification_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_logs' }, fetchLogs)
      .subscribe();

    const channel2 = supabase
      .channel('auto_notification_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auto_notification_logs' }, fetchLogs)
      .subscribe();

    const channel3 = supabase
      .channel('hsse_delivery_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hsse_notification_delivery_logs' }, fetchLogs)
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
      supabase.removeChannel(channel3);
    };
  }, [fetchLogs]);

  return {
    logs,
    stats,
    loading,
    refetch: fetchLogs,
  };
}
