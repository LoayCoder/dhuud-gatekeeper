// Re-export PTW hooks for backward compatibility
export { usePTWTypes } from '@/features/ptw/hooks/use-ptw-types';
export type { PTWType } from '@/features/ptw/hooks/use-ptw-types';
export { usePTWProjects, usePTWProjectClearances, useCreatePTWProject, useApproveClearanceCheck, useRejectClearanceCheck } from '@/features/ptw/hooks/use-ptw-projects';
export type { PTWClearanceCheck } from '@/features/ptw/hooks/use-ptw-projects';
export { usePTWPermits } from '@/features/ptw/hooks/use-ptw-permits';
export type { PTWPermit } from '@/features/ptw/hooks/use-ptw-permits';
export { usePTWAuditLogs } from '@/features/ptw/hooks/use-ptw-audit-logs';
export { useOfflinePermitCreation } from '@/features/ptw/hooks/use-offline-permit-creation';
export { usePTWPermitPDF } from '@/features/ptw/hooks/use-ptw-permit-pdf';
export { usePTWDashboardStats } from '@/features/ptw/hooks/use-ptw-dashboard-stats';
export { usePTWAnalytics } from '@/features/ptw/hooks/use-ptw-analytics';
export { useProjectContextWorkers } from '@/features/ptw/hooks/use-project-context-workers';
export { useMobilizationCheck } from '@/features/ptw/hooks/use-mobilization-check';
