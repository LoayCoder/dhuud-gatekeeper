import { useQuery } from '@tanstack/react-query';

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
  actor?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export function usePTWAuditLogs(permitId: string | undefined) {
  return useQuery({
    queryKey: ['ptw-audit-logs', permitId],
    queryFn: async (): Promise<PTWAuditLog[]> => {
      if (!permitId) return [];
      const { getPTWAuditLogs } = await import('@/features/ptw/services/ptwProjectService');
      return getPTWAuditLogs(permitId) as Promise<PTWAuditLog[]>;
    },
    enabled: !!permitId,
  });
}

export function usePTWProjectAuditLogs(projectId: string | undefined) {
  return useQuery({
    queryKey: ['ptw-project-audit-logs', projectId],
    queryFn: async (): Promise<PTWAuditLog[]> => {
      if (!projectId) return [];
      const { getPTWProjectAuditLogs } = await import('@/features/ptw/services/ptwProjectService');
      return getPTWProjectAuditLogs(projectId) as Promise<PTWAuditLog[]>;
    },
    enabled: !!projectId,
  });
}

export function usePTWRecentAuditActivity(limit = 20) {
  return useQuery({
    queryKey: ['ptw-recent-audit-activity', limit],
    queryFn: async (): Promise<PTWAuditLog[]> => {
      const { getPTWRecentAuditActivity } = await import('@/features/ptw/services/ptwProjectService');
      return getPTWRecentAuditActivity(limit) as Promise<PTWAuditLog[]>;
    },
  });
}
