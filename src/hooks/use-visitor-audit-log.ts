/**
 * Visitor Audit Log Hook
 * 
 * Manages audit trail queries for visitor actions.
 * VISITOR-ONLY - Separate from worker audit logs.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export type VisitorAuditLog = Tables<'visitor_audit_log'>;

interface UseVisitorAuditLogFilters {
  visitorId?: string;
  visitRequestId?: string;
  actionType?: string;
  limit?: number;
}

export function useVisitorAuditLog(filters?: UseVisitorAuditLogFilters) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor-audit-log', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let query = supabase
        .from('visitor_audit_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (filters?.visitorId) {
        query = query.eq('visitor_id', filters.visitorId);
      }
      if (filters?.visitRequestId) {
        query = query.eq('visit_request_id', filters.visitRequestId);
      }
      if (filters?.actionType) {
        query = query.eq('action_type', filters.actionType);
      }

      const { data, error } = await query.limit(filters?.limit || 100);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useVisitorAuditByVisit(visitRequestId: string | undefined) {
  return useVisitorAuditLog({ visitRequestId });
}

export function useVisitorAuditByVisitor(visitorId: string | undefined) {
  return useVisitorAuditLog({ visitorId });
}
