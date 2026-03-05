export interface ModuleStats {
    total: number;
    pending: number;
    overdue: number;
    inProgress: number;
    completed: number;
}

export interface ActionCenterStats {
    incidents: ModuleStats & {
        openInvestigations: number;
        pendingApprovals: number;
    };
    observations: ModuleStats;
    gatePasses: ModuleStats & {
        pendingApprovals: number;
        todayActive: number;
    };
    inspections: ModuleStats & {
        scheduled: number;
        pendingActions: number;
    };
    audits: ModuleStats & {
        openFindings: number;
    };
    contractors: ModuleStats & {
        pendingApprovals: number;
        expiringCompliance: number;
    };
    videoInductions: {
        totalAssigned: number;
        completed: number;
        pending: number;
        overdue: number;
    };
    users: {
        totalUsers: number;
        activeUsers: number;
        pendingInvites: number;
    };
    summary: {
        totalOverdue: number;
        totalPendingApprovals: number;
        totalInProgress: number;
        totalActions: number;
    };
}

export const defaultModuleStats: ModuleStats = {
    total: 0,
    pending: 0,
    overdue: 0,
    inProgress: 0,
    completed: 0,
};
