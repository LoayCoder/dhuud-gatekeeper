import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { ActionCenterStats } from './types';
import { defaultModuleStats } from './types';
import {
    fetchIncidentStats,
    fetchCorrectiveActionStats,
    fetchGatePassStats,
    fetchInspectionStats,
    fetchContractorStats,
    fetchInductionStats,
    fetchUserStats,
} from './stat-fetchers';

function getEmptyStats(): ActionCenterStats {
    return {
        incidents: { ...defaultModuleStats, openInvestigations: 0, pendingApprovals: 0 },
        observations: { ...defaultModuleStats },
        gatePasses: { ...defaultModuleStats, pendingApprovals: 0, todayActive: 0 },
        inspections: { ...defaultModuleStats, scheduled: 0, pendingActions: 0 },
        audits: { ...defaultModuleStats, openFindings: 0 },
        contractors: { ...defaultModuleStats, pendingApprovals: 0, expiringCompliance: 0 },
        videoInductions: { totalAssigned: 0, completed: 0, pending: 0, overdue: 0 },
        users: { totalUsers: 0, activeUsers: 0, pendingInvites: 0 },
        summary: { totalOverdue: 0, totalPendingApprovals: 0, totalInProgress: 0, totalActions: 0 },
    };
}

export function useActionCenterStats() {
    const { user, profile } = useAuth();
    const tenantId = profile?.tenant_id;

    return useQuery({
        queryKey: ['action-center-stats', tenantId, user?.id],
        queryFn: async (): Promise<ActionCenterStats> => {
            if (!tenantId || !user?.id) return getEmptyStats();
            const now = new Date().toISOString();

            const [incidentStats, correctiveActionStats, gatePassStats, inspectionStats, contractorStats, inductionStats, userStats] =
                await Promise.all([
                    fetchIncidentStats(tenantId),
                    fetchCorrectiveActionStats(tenantId, now),
                    fetchGatePassStats(tenantId, now),
                    fetchInspectionStats(tenantId),
                    fetchContractorStats(tenantId),
                    fetchInductionStats(tenantId),
                    fetchUserStats(tenantId),
                ]);

            const incidents: ActionCenterStats['incidents'] = {
                total: incidentStats.total,
                pending: correctiveActionStats.incidentPending,
                overdue: correctiveActionStats.incidentOverdue,
                inProgress: correctiveActionStats.incidentInProgress,
                completed: correctiveActionStats.incidentCompleted,
                openInvestigations: incidentStats.openInvestigations,
                pendingApprovals: incidentStats.pendingApprovals,
            };

            const observations = {
                total: correctiveActionStats.observationPending + correctiveActionStats.observationInProgress + correctiveActionStats.observationCompleted + correctiveActionStats.observationOverdue,
                pending: correctiveActionStats.observationPending,
                overdue: correctiveActionStats.observationOverdue,
                inProgress: correctiveActionStats.observationInProgress,
                completed: correctiveActionStats.observationCompleted,
            };

            const gatePasses: ActionCenterStats['gatePasses'] = {
                total: gatePassStats.total, pending: gatePassStats.pending, overdue: 0,
                inProgress: gatePassStats.active, completed: gatePassStats.completed,
                pendingApprovals: gatePassStats.pendingApprovals, todayActive: gatePassStats.todayActive,
            };

            const inspections: ActionCenterStats['inspections'] = {
                total: inspectionStats.total,
                pending: correctiveActionStats.inspectionPending,
                overdue: correctiveActionStats.inspectionOverdue,
                inProgress: correctiveActionStats.inspectionInProgress,
                completed: correctiveActionStats.inspectionCompleted,
                scheduled: inspectionStats.scheduled,
                pendingActions: inspectionStats.pendingActions,
            };

            const audits: ActionCenterStats['audits'] = {
                total: inspectionStats.auditTotal, pending: 0, overdue: 0,
                inProgress: inspectionStats.auditInProgress, completed: inspectionStats.auditCompleted,
                openFindings: inspectionStats.openFindings,
            };

            const contractors: ActionCenterStats['contractors'] = {
                total: contractorStats.total, pending: contractorStats.pending, overdue: 0, inProgress: 0,
                completed: contractorStats.approved, pendingApprovals: contractorStats.pendingApprovals,
                expiringCompliance: contractorStats.expiringCompliance,
            };

            const totalOverdue = correctiveActionStats.incidentOverdue + correctiveActionStats.observationOverdue + correctiveActionStats.inspectionOverdue + (inductionStats.overdue || 0);
            const totalPendingApprovals = (incidentStats.pendingApprovals || 0) + gatePassStats.pendingApprovals + contractorStats.pendingApprovals;
            const totalInProgress = correctiveActionStats.incidentInProgress + correctiveActionStats.observationInProgress + correctiveActionStats.inspectionInProgress + gatePassStats.active;
            const totalActions = totalOverdue + totalPendingApprovals + totalInProgress +
                correctiveActionStats.incidentPending + correctiveActionStats.observationPending + correctiveActionStats.inspectionPending + gatePassStats.pending;

            return {
                incidents, observations, gatePasses, inspections, audits, contractors,
                videoInductions: { totalAssigned: inductionStats.totalAssigned, completed: inductionStats.completed, pending: inductionStats.pending, overdue: inductionStats.overdue },
                users: { totalUsers: userStats.total, activeUsers: userStats.active, pendingInvites: userStats.pendingInvites },
                summary: { totalOverdue, totalPendingApprovals, totalInProgress, totalActions },
            };
        },
        enabled: !!tenantId && !!user?.id,
        refetchInterval: 60000,
        staleTime: 30000,
    });
}
