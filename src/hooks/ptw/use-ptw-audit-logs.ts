import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PTWAuditLog {
  id: string;
  tenant_id: string;
  permit_id: string | null;
  project_id: string | null;
  actor_id: string | null;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  // Joined data
  actor?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Hook to fetch audit logs for a specific PTW permit
 */
export function usePTWAuditLogs(permitId: string | undefined) {
  return useQuery({
    queryKey: ['ptw-audit-logs', permitId],
    queryFn: async (): Promise<PTWAuditLog[]> => {
      if (!permitId) return [];

      const { data, error } = await supabase
        .from('ptw_audit_logs')
        .select(`
          id,
          tenant_id,
          permit_id,
          project_id,
          actor_id,
          action,
          old_value,
          new_value,
          ip_address,
          created_at,
          actor:profiles!ptw_audit_logs_actor_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('permit_id', permitId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PTWAuditLog[];
    },
    enabled: !!permitId,
  });
}

/**
 * Hook to fetch audit logs for a specific PTW project
 */
export function usePTWProjectAuditLogs(projectId: string | undefined) {
  return useQuery({
    queryKey: ['ptw-project-audit-logs', projectId],
    queryFn: async (): Promise<PTWAuditLog[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('ptw_audit_logs')
        .select(`
          id,
          tenant_id,
          permit_id,
          project_id,
          actor_id,
          action,
          old_value,
          new_value,
          ip_address,
          created_at,
          actor:profiles!ptw_audit_logs_actor_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PTWAuditLog[];
    },
    enabled: !!projectId,
  });
}

/**
 * Hook to fetch recent audit activity across all permits
 */
export function usePTWRecentAuditActivity(limit = 20) {
  return useQuery({
    queryKey: ['ptw-recent-audit-activity', limit],
    queryFn: async (): Promise<PTWAuditLog[]> => {
      const { data, error } = await supabase
        .from('ptw_audit_logs')
        .select(`
          id,
          tenant_id,
          permit_id,
          project_id,
          actor_id,
          action,
          old_value,
          new_value,
          ip_address,
          created_at,
          actor:profiles!ptw_audit_logs_actor_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as PTWAuditLog[];
    },
  });
}
