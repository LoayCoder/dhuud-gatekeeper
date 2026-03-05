// Barrel file — re-exports all investigation hooks and types
export type {
    RootCauseEntry,
    ContributingFactorEntry,
    Investigation,
    FiveWhyEntry,
    CorrectiveAction,
    IncidentAuditLog,
} from './types';

export {
    useInvestigation,
    useCorrectiveActions,
    useIncidentAuditLogs,
} from './use-investigation-queries';

export {
    useCreateInvestigation,
    useUnlockRCA,
    useUpdateInvestigation,
    useLockRCA,
    useCreateCorrectiveAction,
    useUpdateCorrectiveAction,
    useVerifyCorrectiveAction,
    useDeleteCorrectiveAction,
    useSubmitInvestigation,
} from './use-investigation-mutations';
