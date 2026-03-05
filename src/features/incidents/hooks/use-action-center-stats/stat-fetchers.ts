// Stat fetcher functions for action center stats
// All functions return `any` to match the flexible consumption in use-action-center-stats.ts
import { supabase } from '@/integrations/supabase/client';

export async function fetchIncidentStats(tenantId: string): Promise<any> {
  const { count: total } = await (supabase as any).from('incidents')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .eq('event_type', 'incident');

  const { count: open } = await (supabase as any).from('incidents')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .eq('event_type', 'incident')
    .neq('status', 'closed');

  return {
    total: total || 0,
    open: open || 0,
    overdue: 0,
    openInvestigations: 0,
    pendingApprovals: 0,
  };
}

export async function fetchCorrectiveActionStats(tenantId: string, _now?: string): Promise<any> {
  const now = _now || new Date().toISOString();
  const { count: total } = await (supabase as any).from('corrective_actions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  const { count: pending } = await (supabase as any).from('corrective_actions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .eq('status', 'pending');

  const { count: overdue } = await (supabase as any).from('corrective_actions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .lt('due_date', now)
    .not('status', 'in', '("completed","verified","cancelled")');

  return {
    total: total || 0,
    open: pending || 0,
    overdue: overdue || 0,
    incidentPending: pending || 0,
    incidentOverdue: overdue || 0,
    incidentInProgress: 0,
    incidentCompleted: 0,
    observationPending: 0,
    observationOverdue: 0,
    observationInProgress: 0,
    observationCompleted: 0,
    inspectionPending: 0,
    inspectionOverdue: 0,
    inspectionInProgress: 0,
    inspectionCompleted: 0,
  };
}

export async function fetchGatePassStats(tenantId: string, _now?: string): Promise<any> {
  const { count: total } = await (supabase as any).from('gate_passes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  return {
    total: total || 0,
    open: 0,
    overdue: 0,
    pending: 0,
    active: 0,
    completed: 0,
    pendingApprovals: 0,
    todayActive: 0,
  };
}

export async function fetchInspectionStats(tenantId: string): Promise<any> {
  const { count: total } = await (supabase as any).from('inspection_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  return {
    total: total || 0,
    open: 0,
    overdue: 0,
    scheduled: 0,
    pendingActions: 0,
    auditTotal: 0,
    auditInProgress: 0,
    auditCompleted: 0,
    openFindings: 0,
  };
}

export async function fetchContractorStats(tenantId: string): Promise<any> {
  const { count: total } = await (supabase as any).from('contractor_companies')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  return {
    total: total || 0,
    open: 0,
    overdue: 0,
    pending: 0,
    approved: 0,
    pendingApprovals: 0,
    expiringCompliance: 0,
  };
}

export async function fetchInductionStats(tenantId: string): Promise<any> {
  return {
    total: 0,
    open: 0,
    overdue: 0,
    totalAssigned: 0,
    completed: 0,
    pending: 0,
  };
}

export async function fetchUserStats(tenantId: string): Promise<any> {
  const { count: total } = await (supabase as any).from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  return {
    total: total || 0,
    active: 0,
    pendingInvites: 0,
  };
}
