import { supabase } from '@/integrations/supabase/client';

export async function fetchIncidentStats(tenantId: string) {
    const [totalRes, investigationsRes, approvalsRes] = await Promise.all([
        supabase
            .from('incidents')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null),
        supabase
            .from('incidents')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .in('status', ['investigation_pending', 'investigation_in_progress']),
        supabase
            .from('incidents')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .in('status', ['pending_dept_rep_incident_review', 'pending_manager_approval', 'pending_department_manager_approval', 'pending_expert_screening']),
    ]);

    return {
        total: totalRes.count || 0,
        openInvestigations: investigationsRes.count || 0,
        pendingApprovals: approvalsRes.count || 0,
    };
}

export async function fetchObservationStats(tenantId: string) {
    // Observations are tracked via corrective actions with source_type 'observation'
    // This function is not directly used by use-action-center-stats (observations come from fetchCorrectiveActionStats)
    return {};
}

export async function fetchCorrectiveActionStats(tenantId: string, now: string) {
    const today = now.split('T')[0];
    const sources = ['incident', 'observation', 'inspection'] as const;
    const statusGroups = {
        pending: ['assigned', 'open', 'pending'],
        inProgress: ['in_progress'],
        completed: ['completed', 'verified', 'closed'],
    };

    // Build parallel queries for each source × status group + overdue
    const queries: Promise<{ count: number | null }>[] = [];

    for (const source of sources) {
        // pending
        queries.push(
            supabase
                .from('corrective_actions')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .is('deleted_at', null)
                .eq('source_type', source)
                .in('status', statusGroups.pending)
        );
        // in_progress
        queries.push(
            supabase
                .from('corrective_actions')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .is('deleted_at', null)
                .eq('source_type', source)
                .in('status', statusGroups.inProgress)
        );
        // completed
        queries.push(
            supabase
                .from('corrective_actions')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .is('deleted_at', null)
                .eq('source_type', source)
                .in('status', statusGroups.completed)
        );
        // overdue: due_date < today AND not completed
        queries.push(
            supabase
                .from('corrective_actions')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .is('deleted_at', null)
                .eq('source_type', source)
                .not('status', 'in', '("completed","verified","closed")')
                .lt('due_date', today)
        );
    }

    const results = await Promise.all(queries);

    // Each source has 4 results: pending, inProgress, completed, overdue
    const extract = (sourceIdx: number) => ({
        pending: results[sourceIdx * 4].count || 0,
        inProgress: results[sourceIdx * 4 + 1].count || 0,
        completed: results[sourceIdx * 4 + 2].count || 0,
        overdue: results[sourceIdx * 4 + 3].count || 0,
    });

    const incident = extract(0);
    const observation = extract(1);
    const inspection = extract(2);

    return {
        incidentPending: incident.pending,
        incidentInProgress: incident.inProgress,
        incidentCompleted: incident.completed,
        incidentOverdue: incident.overdue,
        observationPending: observation.pending,
        observationInProgress: observation.inProgress,
        observationCompleted: observation.completed,
        observationOverdue: observation.overdue,
        inspectionPending: inspection.pending,
        inspectionInProgress: inspection.inProgress,
        inspectionCompleted: inspection.completed,
        inspectionOverdue: inspection.overdue,
    };
}

export async function fetchInspectionStats(tenantId: string) {
    const [totalRes, scheduledRes, inProgressRes, auditTotalRes, auditInProgressRes, auditCompletedRes, findingsRes] = await Promise.all([
        // Total inspections (non-audit)
        supabase
            .from('inspection_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .neq('session_type', 'audit'),
        // Scheduled
        supabase
            .from('inspection_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .neq('session_type', 'audit')
            .eq('status', 'scheduled'),
        // In progress (pendingActions)
        supabase
            .from('inspection_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .neq('session_type', 'audit')
            .eq('status', 'in_progress'),
        // Audit total
        supabase
            .from('inspection_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .eq('session_type', 'audit'),
        // Audit in progress
        supabase
            .from('inspection_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .eq('session_type', 'audit')
            .eq('status', 'in_progress'),
        // Audit completed
        supabase
            .from('inspection_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .eq('session_type', 'audit')
            .eq('status', 'completed'),
        // Open findings
        supabase
            .from('area_inspection_findings')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .in('status', ['open', 'in_progress']),
    ]);

    return {
        total: totalRes.count || 0,
        scheduled: scheduledRes.count || 0,
        pendingActions: inProgressRes.count || 0,
        auditTotal: auditTotalRes.count || 0,
        auditInProgress: auditInProgressRes.count || 0,
        auditCompleted: auditCompletedRes.count || 0,
        openFindings: findingsRes.count || 0,
    };
}

export async function fetchActionStats(tenantId: string) {
    // Not used directly by use-action-center-stats; actions are covered by fetchCorrectiveActionStats
    return {};
}

export async function fetchContractorStats(tenantId: string) {
    const [totalRes, pendingRes, approvedRes, workerApprovalsRes] = await Promise.all([
        supabase
            .from('contractor_companies')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null),
        supabase
            .from('contractor_companies')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .eq('approval_status', 'pending'),
        supabase
            .from('contractor_companies')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .eq('approval_status', 'approved'),
        supabase
            .from('contractor_workers')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .eq('approval_status', 'pending'),
    ]);

    return {
        total: totalRes.count || 0,
        pending: pendingRes.count || 0,
        approved: approvedRes.count || 0,
        pendingApprovals: workerApprovalsRes.count || 0,
        expiringCompliance: 0,
    };
}

export async function fetchInductionStats(tenantId: string) {
    const now = new Date().toISOString();

    const [totalRes, completedRes, pendingRes, overdueRes] = await Promise.all([
        supabase
            .from('worker_inductions')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null),
        supabase
            .from('worker_inductions')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .eq('status', 'acknowledged'),
        supabase
            .from('worker_inductions')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .in('status', ['sent', 'viewed']),
        supabase
            .from('worker_inductions')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .neq('status', 'acknowledged')
            .lt('expires_at', now),
    ]);

    return {
        totalAssigned: totalRes.count || 0,
        completed: completedRes.count || 0,
        pending: pendingRes.count || 0,
        overdue: overdueRes.count || 0,
    };
}

export async function fetchUserStats(tenantId: string) {
    const [totalRes, activeRes, pendingRes] = await Promise.all([
        supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null),
        supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .eq('is_active', true),
        supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .eq('is_active', false),
    ]);

    return {
        total: totalRes.count || 0,
        active: activeRes.count || 0,
        pendingInvites: pendingRes.count || 0,
    };
}

export async function fetchGatePassStats(tenantId: string, now: string) {
    const today = now.split('T')[0];

    const [totalRes, pendingRes, activeRes, completedRes, todayActiveRes] = await Promise.all([
        supabase
            .from('material_gate_passes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null),
        supabase
            .from('material_gate_passes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .in('status', ['pending_pm_approval', 'pending_safety_approval', 'pending_club_mgmt_ack']),
        supabase
            .from('material_gate_passes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .eq('status', 'approved'),
        supabase
            .from('material_gate_passes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .in('status', ['exit_confirmed', 'completed']),
        supabase
            .from('material_gate_passes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .eq('status', 'approved')
            .eq('pass_date', today),
    ]);

    const pending = pendingRes.count || 0;

    return {
        total: totalRes.count || 0,
        pending,
        active: activeRes.count || 0,
        completed: completedRes.count || 0,
        pendingApprovals: pending,
        todayActive: todayActiveRes.count || 0,
    };
}
