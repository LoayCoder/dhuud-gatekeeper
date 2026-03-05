// Investigation hooks - stub re-exports
// These hooks were previously in src/hooks and have been moved here
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useInvestigation(incidentId: string | undefined) {
  return useQuery({
    queryKey: ['investigation', incidentId],
    queryFn: async () => {
      if (!incidentId) return null;
      const { data, error } = await (supabase as any)
        .from('investigations')
        .select('*, investigator:profiles!investigations_investigator_id_fkey(id, full_name, job_title)')
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!incidentId,
  });
}

export function useCreateInvestigation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await (supabase as any)
        .from('investigations')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation'] });
    },
  });
}

export function useUpdateInvestigation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { data: result, error } = await (supabase as any)
        .from('investigations')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation'] });
    },
  });
}
