import { supabase } from '@/integrations/supabase/client';

/**
 * All stat fetchers are USER-SPECIFIC (strict personal assignment).
 * They accept both tenantId and userId, filtering by the user's own assignments.
 */

export async function fetchIncidentStats(tenantId: string, userId: string) {
    const [totalRes, investigationsRes, approvalsRes] = await Promise.all([
        // Total incidents reported by the user
        supabase
            .from('incidents')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('reporter_id', userId)
            .is('deleted_at', null),
        // Investigations assigned to this user
        supabase
            .from('investigations')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('investigator_id', userId)
            .is('deleted_at', null),
        // Pending approvals - use RPC-based count via separate hook, return 0 here
        // The actual count comes from usePendingIncidentApprovals in the module
        Promise.resolve({ count: 0 }),
    ]);

    return {
        total: totalRes.count || 0,
        openInvestigations: investigationsRes.count || 0,
        pendingApprovals: approvalsRes.count || 0,
    };
}

export async function fetchObservationStats(_tenantId: string, _userId: string) {
    return {};
}

export async function fetchCorrectiveActionStats(tenantId: string, now: string, userId: string) {
    const today = now.split('T')[0];
    const sources = ['incident', 'observation', 'inspection'] as const;
    const statusGroups = {
        pending: ['assigned', 'open', 'pending'],
        inProgress: ['in_progress'],
        completed: ['completed', 'verified', 'closed'],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queries: any[] = [];

    for (const source of sources) {
        // For incident-source actions, apply the released_at gate
        // (actions are only visible once the investigation is released)
        const baseQuery = () => {
            let q = supabase
                .from('corrective_actions')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('assigned_to', userId)
                .is('deleted_at', null)
                .eq('source_type', source);
            if (source === 'incident') {
                q = q.not('released_at', 'is', null);
            }
            return q;
        };

        // pending
        queries.push(baseQuery().in('status', statusGroups.pending));
        // in_progress
        queries.push(baseQuery().in('status', statusGroups.inProgress));
        // completed
        queries.push(baseQuery().in('status', statusGroups.completed));
        // overdue - due_date < today AND not completed
        queries.push(
            baseQuery()
                .not('status', 'in', '("completed","verified","closed")')
                .lt('due_date', today)
        );
    }

    const results = await Promise.all(queries);

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

export async function fetchInspectionStats(tenantId: string, userId: string) {
    // Helper to reduce type chain depth
    const sessionQuery = () =>
        supabase.from('inspection_sessions').select('id', { count: 'exact', head: true })
            .match({ tenant_id: tenantId, created_by: userId }).is('deleted_at', null);

    const [totalRes, scheduledRes, inProgressRes, auditTotalRes, auditInProgressRes, auditCompletedRes, findingsRes] = await Promise.all([
        sessionQuery().neq('session_type', 'audit'),
        sessionQuery().neq('session_type', 'audit').eq('status', 'scheduled'),
        sessionQuery().neq('session_type', 'audit').eq('status', 'in_progress'),
        sessionQuery().eq('session_type', 'audit'),
        sessionQuery().match({ session_type: 'audit', status: 'in_progress' }),
        sessionQuery().match({ session_type: 'audit', status: 'completed' }),
        supabase.from('area_inspection_findings').select('id', { count: 'exact', head: true })
            .match({ tenant_id: tenantId, created_by: userId }).is('deleted_at', null)
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

export async function fetchActionStats(_tenantId: string) {
    return {};
}

export async function fetchContractorStats(tenantId: string) {
    // Contractor stats remain tenant-wide as they are role-gated at the module visibility level
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
    // Induction stats remain tenant-wide (organizational/admin module)
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
    // User stats remain tenant-wide (admin module)
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

export async function fetchGatePassStats(tenantId: string, now: string, userId: string) {
    const today = now.split('T')[0];

    const [totalRes, pendingRes, activeRes, completedRes, todayActiveRes] = await Promise.all([
        // Gate passes requested by this user
        supabase
            .from('material_gate_passes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('requested_by', userId)
            .is('deleted_at', null),
        supabase
            .from('material_gate_passes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('requested_by', userId)
            .is('deleted_at', null)
            .in('status', ['pending_pm_approval', 'pending_safety_approval', 'pending_club_mgmt_ack']),
        supabase
            .from('material_gate_passes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('requested_by', userId)
            .is('deleted_at', null)
            .eq('status', 'approved'),
        supabase
            .from('material_gate_passes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('requested_by', userId)
            .is('deleted_at', null)
            .in('status', ['exit_confirmed', 'completed']),
        supabase
            .from('material_gate_passes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('requested_by', userId)
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
