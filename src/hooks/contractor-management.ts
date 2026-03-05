// Stub: contractor-management hooks
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCreateContractorWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await (supabase as any)
        .from('contractor_workers')
        .insert(data);
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
