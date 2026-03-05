// Barrel file — re-exports all area inspection hooks and types
export type {
    AreaInspectionResponse,
    AreaTemplate,
    CreateAreaSessionInput,
    SaveAreaResponseInput,
    AreaChecklistProgress,
} from './types';

export {
    useAreaTemplates,
    useAreaTemplate,
    useAreaInspectionResponses,
    useAreaChecklistProgress,
} from './use-area-inspection-queries';

export {
    useCreateAreaSession,
    useStartAreaSession,
    useSaveAreaResponse,
    useCompleteAreaSession,
    useUpdateAreaSession,
} from './use-area-inspection-mutations';
