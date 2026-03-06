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

export interface PublicGatePassStatusData {
  id: string;
  reference_number: string;
  status: string;
  brand_color?: string;
  rejection_reason?: string;
  requester_name?: string;
  requester_phone?: string;
  requester_company?: string;
  vehicle_plate_letters?: string;
  vehicle_plate_numbers?: string;
  driver_name?: string;
  start_date?: string;
  end_date?: string;
  pass_type?: string;
  latitude?: number;
  longitude?: number;
  logo_url?: string;
  name?: string;
  address?: string;
  items?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export function usePublicGatePassStatus(tenantSlug?: string, token?: string) {
  return useQuery({ queryKey: ['public-gate-pass-status', tenantSlug, token], queryFn: async () => ({} as PublicGatePassStatusData), enabled: !!tenantSlug && !!token });
}

export function usePublicGatePassRealtime(tenantSlug?: string, token?: string, onUpdate?: () => void) {
  // Stub: realtime subscription placeholder
  return { isConnected: false };
}
