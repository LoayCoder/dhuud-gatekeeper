import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export function useCanPerformExpertScreening() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['can-perform-expert-screening', user?.id],
        queryFn: async () => {
            if (!user?.id) return false;
            const { canPerformExpertScreening } = await import('@/features/incidents');
            return canPerformExpertScreening(user.id);
        },
        enabled: !!user?.id,
    });
}

export function useCanApproveInvestigation(incidentId: string | null) {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['can-approve-investigation', user?.id, incidentId],
        queryFn: async () => {
            if (!user?.id || !incidentId) return false;
            const { canApproveInvestigation } = await import('@/features/incidents');
            return canApproveInvestigation(user.id, incidentId);
        },
        enabled: !!user?.id && !!incidentId,
    });
}

export function useIncidentDepartmentManager(incidentId: string | null) {
    return useQuery({
        queryKey: ['incident-department-manager', incidentId],
        queryFn: async () => {
            if (!incidentId) return null;
            const { getIncidentDepartmentManager } = await import('@/features/incidents');
            return getIncidentDepartmentManager(incidentId);
        },
        enabled: !!incidentId,
    });
}

export function useCanApproveDeptRep(incidentId: string | null) {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['can-approve-dept-rep', user?.id, incidentId],
        queryFn: async () => {
            if (!user?.id || !incidentId) return false;
            const { canApproveDeptRep } = await import('@/features/incidents');
            return canApproveDeptRep(user.id, incidentId);
        },
        enabled: !!user?.id && !!incidentId,
    });
}
