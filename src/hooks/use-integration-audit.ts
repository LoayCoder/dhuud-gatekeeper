import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityModule, ActivityEventType } from '@/lib/activity-logger';

export interface IntegrationAuditEntry {
  id: string;
  timestamp: string;
  event_type: ActivityEventType;
  source_module: ActivityModule;
  target_module?: ActivityModule;
  actor_id: string | null;
  actor_name: string | null;
  entity_type: 'permit' | 'project' | 'worker' | 'contractor' | 'induction' | 'gate_pass';
  entity_id: string;
  entity_reference?: string;
  status: 'success' | 'failed' | 'warning';
  details: Record<string, unknown>;
}

// Cross-module event types to filter
const CROSS_MODULE_EVENTS: ActivityEventType[] = [
  'ptw_permit_created',
  'ptw_permit_status_changed',
  'ptw_permit_validation_failed',
  'ptw_permit_validation_passed',
  'ptw_project_mobilized',
  'ptw_project_clearance_updated',
  'contractor_worker_assigned',
  'contractor_status_changed',
  'contractor_blacklisted',
  'induction_sent',
  'induction_completed',
  'induction_expired',
  'induction_expiry_check',
  'worker_access_revoked',
  'gate_pass_approved',
  'gate_pass_rejected',
];

export function useIntegrationAuditLogs(limit: number = 10) {
  return useQuery({
    queryKey: ['integration-audit-logs', limit],
    queryFn: async (): Promise<IntegrationAuditEntry[]> => {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select(`
          id,
          created_at,
          event_type,
          user_id,
          metadata
        `)
        .in('event_type', CROSS_MODULE_EVENTS as any)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching integration audit logs:', error);
        throw error;
      }

      // Fetch user names for actors
      const userIds = [...new Set((data || []).map(d => d.user_id).filter(Boolean))];
      let userMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        userMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || 'Unknown';
          return acc;
        }, {} as Record<string, string>);
      }

      return (data || []).map((log) => {
        const metadata = (log.metadata || {}) as Record<string, unknown>;
        return {
          id: log.id,
          timestamp: log.created_at,
          event_type: log.event_type as ActivityEventType,
          source_module: (metadata.source_module as ActivityModule) || 'system',
          target_module: metadata.target_module as ActivityModule | undefined,
          actor_id: log.user_id,
          actor_name: log.user_id ? userMap[log.user_id] || 'System' : 'System',
          entity_type: (metadata.entity_type as IntegrationAuditEntry['entity_type']) || 'permit',
          entity_id: (metadata.entity_id as string) || '',
          entity_reference: metadata.entity_reference as string | undefined,
          status: (metadata.integration_status as IntegrationAuditEntry['status']) || 'success',
          details: metadata,
        };
      });
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export interface IntegrationAuditStats {
  totalEvents: number;
  successCount: number;
  failedCount: number;
  warningCount: number;
  byModule: Record<ActivityModule, number>;
  recentTrend: 'up' | 'down' | 'stable';
}

export function useIntegrationAuditStats() {
  return useQuery({
    queryKey: ['integration-audit-stats'],
    queryFn: async (): Promise<IntegrationAuditStats> => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const { data: recentEvents, error } = await supabase
        .from('user_activity_logs')
        .select('id, event_type, metadata, created_at')
        .in('event_type', CROSS_MODULE_EVENTS as any)
        .gte('created_at', last24h.toISOString());

      if (error) {
        console.error('Error fetching audit stats:', error);
        throw error;
      }

      const { data: previousEvents } = await supabase
        .from('user_activity_logs')
        .select('id')
        .in('event_type', CROSS_MODULE_EVENTS as any)
        .gte('created_at', last48h.toISOString())
        .lt('created_at', last24h.toISOString());

      const events = recentEvents || [];
      const previousCount = previousEvents?.length || 0;

      let successCount = 0;
      let failedCount = 0;
      let warningCount = 0;
      const byModule: Record<ActivityModule, number> = {
        ptw: 0,
        contractor: 0,
        induction: 0,
        gate: 0,
        auth: 0,
        system: 0,
      };

      events.forEach((event) => {
        const metadata = (event.metadata || {}) as Record<string, unknown>;
        const status = metadata.integration_status as string;
        const sourceModule = (metadata.source_module as ActivityModule) || 'system';

        if (status === 'failed') failedCount++;
        else if (status === 'warning') warningCount++;
        else successCount++;

        byModule[sourceModule] = (byModule[sourceModule] || 0) + 1;
      });

      let recentTrend: 'up' | 'down' | 'stable' = 'stable';
      if (events.length > previousCount * 1.2) recentTrend = 'up';
      else if (events.length < previousCount * 0.8) recentTrend = 'down';

      return {
        totalEvents: events.length,
        successCount,
        failedCount,
        warningCount,
        byModule,
        recentTrend,
      };
    },
    staleTime: 60 * 1000,
  });
}
