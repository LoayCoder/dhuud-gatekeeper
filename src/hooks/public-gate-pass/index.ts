/**
 * Public gate pass hooks - barrel re-exports + stubs
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Re-export from features
export { useTenantBySlug, usePublicGatePassEnabled } from '@/features/contractors/hooks/use-tenant-by-slug';
export { usePublicBranches, usePublicBranch } from '@/features/contractors/hooks/use-public-branches';

export function usePublicGatePassRequest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: Record<string, unknown>) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['public-gate-pass'] }) });
}

export function useSubmitPublicGatePass() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: Record<string, unknown>) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['public-gate-pass'] }) });
}

export function usePublicGatePassStatus(tenantSlug?: string, token?: string) {
  return useQuery({ queryKey: ['public-gate-pass-status', tenantSlug, token], queryFn: async () => ({} as Record<string, unknown>), enabled: !!tenantSlug && !!token });
}

export function usePublicGatePassRealtime(tenantSlug?: string, token?: string, onUpdate?: () => void) {
  // Stub: realtime subscription placeholder
  return { isConnected: false };
}
