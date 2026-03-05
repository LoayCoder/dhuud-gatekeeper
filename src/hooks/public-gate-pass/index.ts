/**
 * Public gate pass hooks stub
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function usePublicGatePassRequest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: any) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['public-gate-pass'] }) });
}

export function usePublicGatePassStatus(referenceId?: string) {
  return useQuery({ queryKey: ['public-gate-pass-status', referenceId], queryFn: async () => ({} as any), enabled: !!referenceId });
}
