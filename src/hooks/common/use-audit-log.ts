/**
 * Unified audit logging hook
 * Provides consistent audit trail functionality across all modules
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  AuditLogEntry, 
  AuditLogInsert, 
  AuditLogFilter, 
  AuditActionType, 
  AuditEntityType,
  createDiffAuditEntry 
} from '@/types/audit.types';
import { logger } from '@/lib/logger';

// Re-export types for convenience
export type { AuditLogEntry, AuditLogInsert, AuditLogFilter, AuditActionType, AuditEntityType };
export { createDiffAuditEntry } from '@/types/audit.types';

/**
 * Get client IP address (best effort)
 */
async function getClientIP(): Promise<string | null> {
  try {
    // Try to get IP from a public API (works in most cases)
    const response = await fetch('https://api.ipify.org?format=json', { 
      signal: AbortSignal.timeout(2000) 
    });
    const data = await response.json();
    return data.ip || null;
  } catch {
    // Fallback - IP will be captured by edge function if needed
    return null;
  }
}

/**
 * Hook to log audit entries
 */
export function useAuditLog() {
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: async (entry: AuditLogInsert) => {
      // Get current user if not provided
      let userId = entry.who_id;
      let tenantId = entry.tenant_id;

      if (!userId || !tenantId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        userId = userId || user.id;

        // Get tenant_id from profile if not provided
        if (!tenantId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();
          
          tenantId = profile?.tenant_id;
          if (!tenantId) throw new Error('Tenant not found');
        }
      }

      // Try to get IP address
      const ip_address = entry.ip_address || await getClientIP();

      const auditEntry = {
        who_id: userId,
        action_type: entry.action_type,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        old_value: entry.old_value,
        new_value: entry.new_value,
        timestamp: entry.timestamp || new Date().toISOString(),
        ip_address,
        tenant_id: tenantId,
        description: entry.description,
        metadata: entry.metadata,
      };

      // Log to asset_audit_logs for asset entities (existing table)
      if (entry.entity_type === 'asset' || entry.entity_type === 'asset_maintenance') {
        const { error } = await supabase
          .from('asset_audit_logs')
          .insert([{
            asset_id: entry.entity_id,
            actor_id: userId,
            action: entry.action_type,
            old_value: entry.old_value ? JSON.parse(JSON.stringify(entry.old_value)) : null,
            new_value: entry.new_value ? JSON.parse(JSON.stringify(entry.new_value)) : null,
            ip_address,
            tenant_id: tenantId,
          }]);

        if (error) {
          logger.error('Failed to log asset audit entry:', error);
          throw error;
        }
      }

      // Also log to security_audit_logs for security-sensitive actions
      if (['user', 'profile'].includes(entry.entity_type) || 
          ['DELETE', 'APPROVE', 'REJECT', 'ESCALATE'].includes(entry.action_type)) {
        try {
          const { error } = await supabase
            .from('security_audit_logs')
            .insert([{
              actor_id: userId,
              tenant_id: tenantId,
              action: `${entry.action_type}_${entry.entity_type}`.toLowerCase(),
              action_category: entry.entity_type,
              entity_type: entry.entity_type,
              entity_id: entry.entity_id,
              old_value: entry.old_value ? JSON.parse(JSON.stringify(entry.old_value)) : null,
              new_value: entry.new_value ? JSON.parse(JSON.stringify(entry.new_value)) : null,
              ip_address,
              result: 'success',
            }]);

          if (error) {
            logger.warn('Failed to log security audit entry:', error);
          }
        } catch (err) {
          logger.warn('Security audit log failed:', err);
        }
      }

      return auditEntry;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant audit queries
      queryClient.invalidateQueries({ 
        queryKey: ['audit-logs', variables.entity_type] 
      });
    },
    onError: (error) => {
      logger.error('Audit log mutation failed:', error);
    },
  });

  /**
   * Log an audit entry
   */
  const log = async (entry: AuditLogInsert) => {
    return logMutation.mutateAsync(entry);
  };

  /**
   * Convenience method for CREATE actions
   */
  const logCreate = async (
    entityType: AuditEntityType,
    entityId: string,
    newValue: Record<string, unknown>,
    description?: string
  ) => {
    return log({
      who_id: '',
      action_type: 'CREATE',
      entity_type: entityType,
      entity_id: entityId,
      old_value: null,
      new_value: newValue,
      tenant_id: '',
      ip_address: null,
      description,
    });
  };

  /**
   * Convenience method for UPDATE actions
   */
  const logUpdate = async (
    entityType: AuditEntityType,
    entityId: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
    description?: string
  ) => {
    return log({
      who_id: '',
      action_type: 'UPDATE',
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      tenant_id: '',
      ip_address: null,
      description,
    });
  };

  /**
   * Convenience method for DELETE actions
   */
  const logDelete = async (
    entityType: AuditEntityType,
    entityId: string,
    oldValue: Record<string, unknown>,
    description?: string
  ) => {
    return log({
      who_id: '',
      action_type: 'DELETE',
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: null,
      tenant_id: '',
      ip_address: null,
      description,
    });
  };

  return {
    log,
    logCreate,
    logUpdate,
    logDelete,
    isLogging: logMutation.isPending,
    error: logMutation.error,
  };
}

/**
 * Hook to fetch audit logs with filtering
 */
export function useAuditLogs(filter: AuditLogFilter) {
  return useQuery({
    queryKey: ['audit-logs', filter.entity_type, filter.entity_id, filter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // For asset entities, use asset_audit_logs
      if (filter.entity_type === 'asset' || filter.entity_type === 'asset_maintenance') {
        let query = supabase
          .from('asset_audit_logs')
          .select('id, asset_id, actor_id, action, old_value, new_value, ip_address, created_at')
          .order('created_at', { ascending: false });

        if (filter.entity_id) {
          query = query.eq('asset_id', filter.entity_id);
        }
        if (filter.who_id) {
          query = query.eq('actor_id', filter.who_id);
        }
        if (filter.action_type) {
          query = query.eq('action', filter.action_type);
        }
        if (filter.start_date) {
          query = query.gte('created_at', filter.start_date.toISOString());
        }
        if (filter.end_date) {
          query = query.lte('created_at', filter.end_date.toISOString());
        }
        if (filter.limit) {
          query = query.limit(filter.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }

      // For other entities, use security_audit_logs
      let query = supabase
        .from('security_audit_logs')
        .select('id, actor_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at')
        .order('created_at', { ascending: false });

      if (filter.entity_type) {
        query = query.eq('entity_type', filter.entity_type);
      }
      if (filter.who_id) {
        query = query.eq('actor_id', filter.who_id);
      }
      if (filter.start_date) {
        query = query.gte('created_at', filter.start_date.toISOString());
      }
      if (filter.end_date) {
        query = query.lte('created_at', filter.end_date.toISOString());
      }
      if (filter.limit) {
        query = query.limit(filter.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000,
    enabled: !!filter.entity_type || !!filter.entity_id,
  });
}
