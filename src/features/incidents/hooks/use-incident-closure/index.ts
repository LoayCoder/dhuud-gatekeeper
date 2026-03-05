// Barrel file — re-exports all incident closure hooks and types
export type {
    ClosureRequest,
    ClosureCheckResult,
} from './types';

export {
    useCanCloseIncident,
    useIncidentClosureEligibility,
    usePendingClosureRequests,
} from './use-closure-queries';

export {
    useIncidentClosureApproval,
    useRequestIncidentClosure,
    useApproveIncidentClosure,
    useRejectIncidentClosure,
    useReopenIncident,
} from './use-closure-mutations';
