import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

const defaultModuleStats: ModuleStats = {
  total: 0,
  pending: 0,
  overdue: 0,
  inProgress: 0,
  completed: 0,
};

export function useActionCenterStats() {
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['action-center-stats', tenantId, user?.id],
    queryFn: async (): Promise<ActionCenterStats> => {
      if (!tenantId || !user?.id) {
        return getEmptyStats();
      }

      const now = new Date().toISOString();

      // Fetch all stats in parallel
      const [
        incidentStats,
        correctiveActionStats,
        gatePassStats,
        inspectionStats,
        contractorStats,
        inductionStats,
        userStats,
      ] = await Promise.all([
        // Incident stats
        fetchIncidentStats(tenantId),
        // Corrective action stats (covers incidents + observations + inspections)
        fetchCorrectiveActionStats(tenantId, user.id, now),
        // Gate pass stats
        fetchGatePassStats(tenantId, now),
        // Inspection stats
        fetchInspectionStats(tenantId, user.id),
        // Contractor stats
        fetchContractorStats(tenantId),
        // Induction stats
        fetchInductionStats(tenantId),
        // User stats
        fetchUserStats(tenantId),
      ]);

      const incidentOverdue = correctiveActionStats.incidentOverdue;
      const incidentPending = correctiveActionStats.incidentPending;
      const incidentInProgress = correctiveActionStats.incidentInProgress;
      const incidentCompleted = correctiveActionStats.incidentCompleted;

      const observationOverdue = correctiveActionStats.observationOverdue;
      const observationPending = correctiveActionStats.observationPending;
      const observationInProgress = correctiveActionStats.observationInProgress;
      const observationCompleted = correctiveActionStats.observationCompleted;

      const inspectionActionOverdue = correctiveActionStats.inspectionOverdue;
      const inspectionActionPending = correctiveActionStats.inspectionPending;
      const inspectionActionInProgress = correctiveActionStats.inspectionInProgress;
      const inspectionActionCompleted = correctiveActionStats.inspectionCompleted;

      const incidents: ActionCenterStats['incidents'] = {
        total: incidentStats.total,
        pending: incidentPending,
        overdue: incidentOverdue,
        inProgress: incidentInProgress,
        completed: incidentCompleted,
        openInvestigations: incidentStats.openInvestigations,
        pendingApprovals: incidentStats.pendingApprovals,
      };

      const observations: ModuleStats = {
        total: observationPending + observationInProgress + observationCompleted + observationOverdue,
        pending: observationPending,
        overdue: observationOverdue,
        inProgress: observationInProgress,
        completed: observationCompleted,
      };

      const gatePasses: ActionCenterStats['gatePasses'] = {
        total: gatePassStats.total,
        pending: gatePassStats.pending,
        overdue: 0,
        inProgress: gatePassStats.active,
        completed: gatePassStats.completed,
        pendingApprovals: gatePassStats.pendingApprovals,
        todayActive: gatePassStats.todayActive,
      };

      const inspections: ActionCenterStats['inspections'] = {
        total: inspectionStats.total,
        pending: inspectionActionPending,
        overdue: inspectionActionOverdue,
        inProgress: inspectionActionInProgress,
        completed: inspectionActionCompleted,
        scheduled: inspectionStats.scheduled,
        pendingActions: inspectionStats.pendingActions,
      };

      const audits: ActionCenterStats['audits'] = {
        total: inspectionStats.auditTotal,
        pending: 0,
        overdue: 0,
        inProgress: inspectionStats.auditInProgress,
        completed: inspectionStats.auditCompleted,
        openFindings: inspectionStats.openFindings,
      };

      const contractors: ActionCenterStats['contractors'] = {
        total: contractorStats.total,
        pending: contractorStats.pending,
        overdue: 0,
        inProgress: 0,
        completed: contractorStats.approved,
        pendingApprovals: contractorStats.pendingApprovals,
        expiringCompliance: contractorStats.expiringCompliance,
      };

      const videoInductions = {
        totalAssigned: inductionStats.totalAssigned,
        completed: inductionStats.completed,
        pending: inductionStats.pending,
        overdue: inductionStats.overdue,
      };

      const users = {
        totalUsers: userStats.total,
        activeUsers: userStats.active,
        pendingInvites: userStats.pendingInvites,
      };

      const totalOverdue = incidentOverdue + observationOverdue + inspectionActionOverdue + (inductionStats.overdue || 0);
      const totalPendingApprovals = (incidentStats.pendingApprovals || 0) + gatePassStats.pendingApprovals + contractorStats.pendingApprovals;
      const totalInProgress = incidentInProgress + observationInProgress + inspectionActionInProgress + gatePassStats.active;
      const totalActions = totalOverdue + totalPendingApprovals + totalInProgress +
        incidentPending + observationPending + inspectionActionPending + gatePassStats.pending;

      return {
        incidents,
        observations,
        gatePasses,
        inspections,
        audits,
        contractors,
        videoInductions,
        users,
        summary: {
          totalOverdue,
          totalPendingApprovals,
          totalInProgress,
          totalActions,
        },
      };
    },
    enabled: !!tenantId && !!user?.id,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
}

// Helper functions to fetch stats per module
async function fetchIncidentStats(tenantId: string) {
  const [totalRes, openInvRes, pendingAppRes] = await Promise.all([
    supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('investigation_status', ['pending', 'in_progress']),
    supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('investigation_status', 'pending'),
  ]);

  return {
    total: totalRes.count || 0,
    openInvestigations: openInvRes.count || 0,
    pendingApprovals: pendingAppRes.count || 0,
  };
}

async function fetchCorrectiveActionStats(tenantId: string, _userId: string, now: string) {
  const empty = {
    incidentOverdue: 0, incidentPending: 0, incidentInProgress: 0, incidentCompleted: 0,
    observationOverdue: 0, observationPending: 0, observationInProgress: 0, observationCompleted: 0,
    inspectionOverdue: 0, inspectionPending: 0, inspectionInProgress: 0, inspectionCompleted: 0,
  };

  // Server-side aggregation via RPC — single query with COUNT FILTER
  // instead of fetching all rows and looping client-side
  const { data, error } = await supabase.rpc('get_corrective_action_stats', {
    p_tenant_id: tenantId,
    p_now: now,
  });

  if (error || !data) return empty;

  return {
    incidentOverdue: Number(data.incidentOverdue) || 0,
    incidentPending: Number(data.incidentPending) || 0,
    incidentInProgress: Number(data.incidentInProgress) || 0,
    incidentCompleted: Number(data.incidentCompleted) || 0,
    observationOverdue: Number(data.observationOverdue) || 0,
    observationPending: Number(data.observationPending) || 0,
    observationInProgress: Number(data.observationInProgress) || 0,
    observationCompleted: Number(data.observationCompleted) || 0,
    inspectionOverdue: Number(data.inspectionOverdue) || 0,
    inspectionPending: Number(data.inspectionPending) || 0,
    inspectionInProgress: Number(data.inspectionInProgress) || 0,
    inspectionCompleted: Number(data.inspectionCompleted) || 0,
  };
}

async function fetchGatePassStats(tenantId: string, now: string) {
  const today = new Date().toISOString().split('T')[0];

  const [totalRes, pendingRes, activeRes, completedRes, todayRes] = await Promise.all([
    supabase
      .from('gate_passes')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('gate_passes')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'pending_dept_approval', 'pending_security_approval']),
    supabase
      .from('gate_passes')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'approved'),
    supabase
      .from('gate_passes')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['completed', 'expired']),
    supabase
      .from('gate_passes')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .gte('valid_until', today),
  ]);

  return {
    total: totalRes.count || 0,
    pending: pendingRes.count || 0,
    pendingApprovals: pendingRes.count || 0,
    active: activeRes.count || 0,
    completed: completedRes.count || 0,
    todayActive: todayRes.count || 0,
  };
}

async function fetchInspectionStats(tenantId: string, userId: string) {
  const [totalRes, scheduledRes, auditRes, findingsRes] = await Promise.all([
    supabase
      .from('inspection_sessions')
      .select('status', { count: 'exact' })
      .eq('tenant_id', tenantId),
    supabase
      .from('inspection_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'scheduled'),
    supabase
      .from('inspection_sessions')
      .select('status, session_type')
      .eq('tenant_id', tenantId)
      .eq('session_type', 'audit'),
    supabase
      .from('area_inspection_findings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['open', 'action_assigned']),
  ]);

  const auditData = auditRes.data || [];
  const auditInProgress = auditData.filter(a => a.status === 'in_progress').length;
  const auditCompleted = auditData.filter(a => ['completed', 'closed'].includes(a.status)).length;

  return {
    total: totalRes.count || 0,
    scheduled: scheduledRes.count || 0,
    pendingActions: findingsRes.count || 0,
    auditTotal: auditData.length,
    auditInProgress,
    auditCompleted,
    openFindings: findingsRes.count || 0,
  };
}

async function fetchContractorStats(tenantId: string) {
  const [totalRes, pendingRes, approvedRes, workersRes] = await Promise.all([
    supabase
      .from('contractor_companies')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('contractor_companies')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending'),
    supabase
      .from('contractor_companies')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'approved'),
    supabase
      .from('contractor_workers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending'),
  ]);

  return {
    total: totalRes.count || 0,
    pending: pendingRes.count || 0,
    approved: approvedRes.count || 0,
    pendingApprovals: (pendingRes.count || 0) + (workersRes.count || 0),
    expiringCompliance: 0,
  };
}

async function fetchInductionStats(tenantId: string) {
  const [totalRes, completedRes] = await Promise.all([
    supabase
      .from('contractor_workers')
      .select('induction_completed', { count: 'exact' })
      .eq('tenant_id', tenantId),
    supabase
      .from('contractor_workers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('induction_completed', true),
  ]);

  const totalAssigned = totalRes.count || 0;
  const completed = completedRes.count || 0;

  return {
    totalAssigned,
    completed,
    pending: totalAssigned - completed,
    overdue: 0,
  };
}

async function fetchUserStats(tenantId: string) {
  const [totalRes, activeRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('account_status', 'active'),
  ]);

  return {
    total: totalRes.count || 0,
    active: activeRes.count || 0,
    pendingInvites: 0,
  };
}

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
