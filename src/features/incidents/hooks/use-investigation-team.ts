// Investigation team hook stub
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useInvestigationTeam(investigationId: string | undefined) {
  return useQuery({
    queryKey: ['investigation-team', investigationId],
    queryFn: async () => {
      if (!investigationId) return [];
      const { data, error } = await (supabase as any)
        .from('investigation_team_members')
        .select('*, profile:profiles(id, full_name, job_title)')
        .eq('investigation_id', investigationId)
        .is('deleted_at', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!investigationId,
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await (supabase as any)
        .from('investigation_team_members')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation-team'] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('investigation_team_members')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation-team'] });
    },
  });
}
