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
  gate_pass: {
    id: string;
    reference_number: string;
    status: string;
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
    items?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  } | null;
  tenant: {
    id: string;
    brand_color?: string;
    logo_url?: string;
    name?: string;
    address?: string;
    [key: string]: unknown;
  } | null;
  branch: {
    id: string;
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    [key: string]: unknown;
  } | null;
  error?: string;
}

export function usePublicGatePassStatus(tenantSlug?: string, token?: string) {
  return useQuery({ queryKey: ['public-gate-pass-status', tenantSlug, token], queryFn: async () => ({ gate_pass: null, tenant: null, branch: null } as PublicGatePassStatusData), enabled: !!tenantSlug && !!token });
}

export function usePublicGatePassRealtime(tenantSlug?: string, token?: string, onUpdate?: () => void) {
  // Stub: realtime subscription placeholder
  return { isConnected: false };
}
