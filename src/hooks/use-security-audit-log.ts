import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SecurityAuditLog {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  action_category: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_identifier: string | null;
  result: 'success' | 'denied' | 'warning' | 'error';
  result_reason: string | null;
  site_id: string | null;
  building_id: string | null;
  gate_name: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogInput {
  action: string;
  action_category: string;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_identifier?: string | null;
  result: 'success' | 'denied' | 'warning' | 'error';
  result_reason?: string | null;
  site_id?: string | null;
  building_id?: string | null;
  gate_name?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

interface UseSecurityAuditLogFilters {
  action_category?: string;
  action?: string;
  entity_type?: string;
  result?: string;
  actor_id?: string;
  site_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
}

export function useSecurityAuditLogs(filters?: UseSecurityAuditLogFilters) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['security-audit-logs', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let query = supabase
        .from('security_audit_logs' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.action_category) {
        query = query.eq('action_category', filters.action_category);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters?.result) {
        query = query.eq('result', filters.result);
      }
      if (filters?.actor_id) {
        query = query.eq('actor_id', filters.actor_id);
      }
      if (filters?.site_id) {
        query = query.eq('site_id', filters.site_id);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters?.search) {
        query = query.or(`entity_identifier.ilike.%${filters.search}%,actor_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SecurityAuditLog[];
    },
    enabled: !!tenantId,
  });
}

export function useLogSecurityAudit() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: AuditLogInput) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const insertData = {
        ...log,
        tenant_id: profile.tenant_id,
        actor_id: user?.id,
        actor_name: profile?.full_name,
        user_agent: navigator.userAgent,
        metadata: log.metadata || {},
      };

      const { error } = await supabase
        .from('security_audit_logs' as any)
        .insert(insertData as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-audit-logs'] });
    },
  });
}

// Helper function to log common security actions
export function createSecurityAuditLogger(logMutation: ReturnType<typeof useLogSecurityAudit>['mutate']) {
  return {
    logGateEntry: (data: {
      entity_type: 'visitor' | 'contractor' | 'worker' | 'vehicle';
      entity_id?: string;
      entity_identifier: string;
      result: SecurityAuditLog['result'];
      result_reason?: string;
      site_id?: string;
      gate_name?: string;
      metadata?: Record<string, unknown>;
    }) => {
      logMutation({
        action: 'gate_entry',
        action_category: 'gate_control',
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        entity_identifier: data.entity_identifier,
        result: data.result,
        result_reason: data.result_reason,
        site_id: data.site_id,
        gate_name: data.gate_name,
        metadata: data.metadata || {},
      });
    },

    logGateExit: (data: {
      entity_type: 'visitor' | 'contractor' | 'worker' | 'vehicle';
      entity_id?: string;
      entity_identifier: string;
      site_id?: string;
      gate_name?: string;
    }) => {
      logMutation({
        action: 'gate_exit',
        action_category: 'gate_control',
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        entity_identifier: data.entity_identifier,
        result: 'success',
        site_id: data.site_id,
        gate_name: data.gate_name,
        metadata: {},
      });
    },

    logBlacklistCheck: (data: {
      entity_identifier: string;
      result: 'success' | 'denied';
      result_reason?: string;
    }) => {
      logMutation({
        action: 'blacklist_check',
        action_category: 'blacklist',
        entity_type: 'visitor',
        entity_identifier: data.entity_identifier,
        result: data.result,
        result_reason: data.result_reason,
        metadata: {},
      });
    },

    logContractorValidation: (data: {
      entity_id?: string;
      entity_identifier: string;
      result: SecurityAuditLog['result'];
      result_reason?: string;
      metadata?: Record<string, unknown>;
    }) => {
      logMutation({
        action: 'contractor_validation',
        action_category: 'contractor_access',
        entity_type: 'contractor',
        entity_id: data.entity_id,
        entity_identifier: data.entity_identifier,
        result: data.result,
        result_reason: data.result_reason,
        metadata: data.metadata || {},
      });
    },

    logPatrolScan: (data: {
      entity_id: string;
      entity_identifier: string;
      result: SecurityAuditLog['result'];
      gps_lat?: number;
      gps_lng?: number;
      metadata?: Record<string, unknown>;
    }) => {
      logMutation({
        action: 'patrol_scan',
        action_category: 'patrol',
        entity_type: 'checkpoint',
        entity_id: data.entity_id,
        entity_identifier: data.entity_identifier,
        result: data.result,
        gps_lat: data.gps_lat,
        gps_lng: data.gps_lng,
        metadata: data.metadata || {},
      });
    },
  };
}
