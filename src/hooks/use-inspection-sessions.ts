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

export function useInspectionSessions(filters?: SessionFilters) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['inspection-sessions', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('inspection_sessions')
        .select('*')
        .is('deleted_at', null);

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.site_id) query = query.eq('site_id', filters.site_id);
      if (filters?.inspector_id) query = query.eq('inspector_id', filters.inspector_id);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(profile as any)?.tenant_id,
  });
}

export function useInspectionSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['inspection-session', sessionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('inspection_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await (supabase as any)
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
      const { error } = await (supabase as any)
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
      const { data, error } = await (supabase as any)
        .from('area_inspection_responses')
        .select('id, result')
        .eq('session_id', sessionId)
        .is('deleted_at', null);
      if (error) throw error;
      const total = (data || []).length;
      const completed = (data || []).filter((r: any) => r.result != null).length;
      return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
    },
    enabled: !!sessionId,
  });
}
