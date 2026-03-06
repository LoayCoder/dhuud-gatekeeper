/**
 * Stub: use-inspection-sessions
 * Re-exports from features/incidents/hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SessionFilters {
  status?: string;
  site_id?: string;
  inspector_id?: string;
}

// LooseClient for tables not yet in generated schema
interface LooseFrom {
  select: (columns: string, opts?: Record<string, unknown>) => LooseFrom;
  eq: (col: string, val: unknown) => LooseFrom;
  is: (col: string, val: unknown) => LooseFrom;
  single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string; code?: string } | null }>;
  update: (vals: Record<string, unknown>) => LooseFrom;
  order: (col: string, opts?: Record<string, unknown>) => LooseFrom;
  then: (resolve: (value: { data: Record<string, unknown>[] | null; error: { message: string; code?: string } | null }) => void) => void;
}
const looseClient = supabase as unknown as { from: (table: string) => LooseFrom };

interface SessionRecord {
  [key: string]: unknown;
}

interface ResponseRecord {
  id: string;
  result: string | null;
}

export function useInspectionSessions(filters?: SessionFilters) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['inspection-sessions', filters],
    queryFn: async () => {
      let query = looseClient
        .from('inspection_sessions')
        .select('*')
        .is('deleted_at', null);

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.site_id) query = query.eq('site_id', filters.site_id);
      if (filters?.inspector_id) query = query.eq('inspector_id', filters.inspector_id);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SessionRecord[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useInspectionSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['inspection-session', sessionId],
    queryFn: async () => {
      const { data, error } = await looseClient
        .from('inspection_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      return data as SessionRecord;
    },
    enabled: !!sessionId,
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await looseClient
        .from('inspection_sessions')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await looseClient
        .from('inspection_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
    },
  });
}

export function useSessionProgress(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-progress', sessionId],
    queryFn: async () => {
      const { data, error } = await looseClient
        .from('area_inspection_responses')
        .select('id, result')
        .eq('session_id', sessionId)
        .is('deleted_at', null);
      if (error) throw error;
      const responses = (data || []) as unknown as ResponseRecord[];
      const total = responses.length;
      const completed = responses.filter((r) => r.result != null).length;
      return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
    },
    enabled: !!sessionId,
  });
}
