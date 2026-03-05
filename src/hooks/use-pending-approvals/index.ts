// Barrel file — re-exports all pending approval hooks and types
export type {
    PendingIncidentApproval,
    PendingActionApproval,
    PendingSeverityApproval,
    PendingPotentialSeverityApproval,
} from './types';

export {
    usePendingActionApprovals,
    usePendingSeverityApprovals,
    usePendingPotentialSeverityApprovals,
    useCanAccessApprovals,
    usePendingIncidentApprovals,
} from './use-pending-approval-queries';

export {
    useVerifyAction,
    useApproveSeverityChange,
    useApprovePotentialSeverityChange,
} from './use-pending-approval-mutations';
