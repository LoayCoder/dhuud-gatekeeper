// Barrel file — re-exports all incident hooks and types
export type {
    Incident,
    IncidentInsert,
    ClosedOnSpotPayload,
    IncidentFormData,
    UseIncidentsOptions,
    IncidentWithDetails,
} from './types';

export {
    useIncidents,
    useIncident,
    useMyReportedIncidents,
    useMyCorrectiveActions,
} from './use-incident-queries';

export {
    useCreateIncident,
    useUpdateMyActionStatus,
    useUpdateIncidentStatus,
    useDeleteIncident,
} from './use-incident-mutations';
