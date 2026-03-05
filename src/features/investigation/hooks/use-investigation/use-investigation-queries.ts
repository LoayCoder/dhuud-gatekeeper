import { useQuery } from "@tanstack/react-query";

export function useInvestigation(incidentId: string | null) {
    return useQuery({
        queryKey: ['investigation', incidentId],
        queryFn: async () => {
            if (!incidentId) return null;
            const { getInvestigation } = await import('@/features/investigation/services/investigationQueryService');
            return getInvestigation(incidentId);
        },
        enabled: !!incidentId,
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
    });
}

export function useCorrectiveActions(incidentId: string | null) {
    return useQuery({
        queryKey: ['corrective-actions', incidentId],
        queryFn: async () => {
            if (!incidentId) return [];

            const { getCorrectiveActions } = await import('@/features/investigation/services/investigationQueryService');
            return getCorrectiveActions(incidentId);
        },
        enabled: !!incidentId,
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
    });
}

export function useIncidentAuditLogs(incidentId: string | null) {
    return useQuery({
        queryKey: ['incident-audit-logs', incidentId],
        queryFn: async () => {
            if (!incidentId) return [];

            const { getIncidentAuditLogs } = await import('@/features/investigation/services/investigationQueryService');
            return getIncidentAuditLogs(incidentId);
        },
        enabled: !!incidentId,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    });
}
