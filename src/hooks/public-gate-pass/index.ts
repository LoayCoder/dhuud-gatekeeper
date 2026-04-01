/**
 * Public gate pass hooks - barrel re-exports
 */

// Re-export from features
export { useTenantBySlug, usePublicGatePassEnabled } from '@/features/contractors/hooks/use-tenant-by-slug';
export { usePublicBranches, usePublicBranch } from '@/features/contractors/hooks/use-public-branches';

// Re-export real implementations (NOT stubs)
export {
  useSubmitPublicGatePass,
  usePublicGatePassStatus,
  usePublicGatePassRealtime,
} from '@/features/contractors/hooks/use-public-gate-pass';

// Re-export types
export type {
  PublicGatePassStatusData,
} from '@/features/contractors/hooks/use-public-gate-pass';
