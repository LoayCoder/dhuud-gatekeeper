import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useBranchFilter } from '@/hooks/use-branch-filter';
import type { UseIncidentsOptions, IncidentWithDetails } from './types';

export function useIncidents({ page = 1, pageSize = 20, filters }: UseIncidentsOptions = {}) {
    const { profile } = useAuth();
    const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();

    return useQuery({
        queryKey: ['incidents', profile?.tenant_id, page, pageSize, filters, ...branchQueryKey],
        queryFn: async () => {
            if (!profile?.tenant_id) return { data: [], count: 0 };
            const { getIncidents } = await import('@/features/incidents/services/incidentQueryService');
            return getIncidents({
                tenantId: profile.tenant_id,
                branchIds: branchIds || [],
                isAllBranchesMode,
                page,
                pageSize,
                filters
            });
        },
        enabled: !!profile?.tenant_id,
        staleTime: 60 * 1000,
        placeholderData: (previousData) => previousData,
    });
}

export function useIncident(id: string | undefined) {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ['incident', id],
        queryFn: async () => {
            if (!id || !profile?.tenant_id) return null;
            const { getIncidentById } = await import('@/features/incidents/services/incidentQueryService');
            const incident = await getIncidentById({
                id,
                tenantId: profile.tenant_id
            });
            return incident as IncidentWithDetails | null;
        },
        enabled: !!id && !!profile?.tenant_id,
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
    });
}

export function useMyReportedIncidents() {
    const { user, profile } = useAuth();

    return useQuery({
        queryKey: ['my-reported-incidents', user?.id],
        queryFn: async () => {
            if (!user?.id || !profile?.tenant_id) return [];
            const { getMyReportedIncidents } = await import('@/features/incidents/services/incidentQueryService');
            return getMyReportedIncidents({
                userId: user.id,
                tenantId: profile.tenant_id
            });
        },
        enabled: !!user?.id && !!profile?.tenant_id,
    });
}

export function useMyCorrectiveActions() {
    const { user, profile } = useAuth();

    return useQuery({
        queryKey: ['my-corrective-actions', user?.id],
        queryFn: async () => {
            if (!user?.id || !profile?.tenant_id) return [];
            const { getMyCorrectiveActions } = await import('@/features/incidents/services/incidentQueryService');
            return getMyCorrectiveActions({
                userId: user.id,
                tenantId: profile.tenant_id
            });
        },
        enabled: !!user?.id && !!profile?.tenant_id,
    });
}
