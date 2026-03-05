// Barrel file — re-exports all inspection session hooks and types
export type { InspectionSession, SessionAsset, InspectionFinding, CreateSessionInput, RecordInspectionInput } from './types';

export {
    useInspectionSessions,
    useInspectionSession,
    useSessionAssets,
    useUninspectedAssets,
    useSessionAssetByAssetId,
    useSessionProgress,
    useSessionFindings,
} from './use-inspection-session-queries';

export {
    useCreateSession,
    useStartSession,
    useRecordAssetInspection,
    useCompleteSession,
    useCloseSession,
    useUpdateSession,
    useDeleteSession,
} from './use-session-lifecycle-mutations';

export {
    useCreateFinding,
    useUpdateFinding,
    useAddAssetToSession,
    useRefreshSessionAssets,
} from './use-session-asset-mutations';

