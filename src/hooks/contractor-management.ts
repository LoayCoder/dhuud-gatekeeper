// Stub: contractor-management hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCreateContractorWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await (supabase
        .from('contractor_workers')
        .insert(data as unknown as Parameters<typeof supabase.from<'contractor_workers'>['insert']>[0]));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-workers'] });
      toast.success('Worker created');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useContractorCompanies(tenantId?: string) {
  return useQuery({ queryKey: ['contractor-companies', tenantId], queryFn: async () => [] as Record<string, unknown>[], enabled: !!tenantId });
}

export function useContractorProjects(tenantId?: string) {
  return useQuery({ queryKey: ['contractor-projects', tenantId], queryFn: async () => [] as Record<string, unknown>[], enabled: !!tenantId });
}
