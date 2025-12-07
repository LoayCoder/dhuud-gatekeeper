import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SessionClosureStatus {
  can_close: boolean;
  all_items_responded: boolean;
  all_findings_resolved: boolean;
  total_items: number;
  responded_items: number;
  total_findings: number;
  open_findings: number;
  pending_actions: Array<{
    finding_id: string;
    finding_ref: string;
    action_id: string | null;
    action_title: string | null;
    action_status: string | null;
  }>;
}

export function useCanCloseSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-closure-status', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');
      
      const { data, error } = await supabase
        .rpc('can_close_area_session', { p_session_id: sessionId });
      
      if (error) throw error;
      return data as unknown as SessionClosureStatus;
    },
    enabled: !!sessionId,
    refetchInterval: 5000, // Poll every 5s to get updated status
  });
}

export function useCompleteAreaSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { error } = await supabase
        .from('inspection_sessions')
        .update({ 
          status: 'completed_with_open_actions',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) throw error;
      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['area-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session-closure-status', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['area-sessions'] });
    },
  });
}

export function useCloseAreaSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      // First verify we can close
      const { data: status, error: checkError } = await supabase
        .rpc('can_close_area_session', { p_session_id: sessionId });
      
      if (checkError) throw checkError;
      
      const closureStatus = status as unknown as SessionClosureStatus;
      if (!closureStatus.can_close) {
        throw new Error('Cannot close session: pending items or actions');
      }
      
      const { error } = await supabase
        .from('inspection_sessions')
        .update({ 
          status: 'closed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) throw error;
      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['area-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session-closure-status', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['area-sessions'] });
    },
  });
}

export function useReopenAreaSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { error } = await supabase
        .from('inspection_sessions')
        .update({ 
          status: 'in_progress',
          completed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) throw error;
      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['area-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session-closure-status', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['area-sessions'] });
    },
  });
}
