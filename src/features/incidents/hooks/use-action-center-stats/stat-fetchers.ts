// Stat fetcher functions for action center stats
import { supabase } from '@/integrations/supabase/client';

export async function fetchIncidentStats(tenantId: string) {
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

  const { count: overdue } = await (supabase as any).from('corrective_actions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .lt('due_date', new Date().toISOString())
    .not('status', 'in', '("completed","verified","cancelled")');

  return {
    total: total || 0,
    open: open || 0,
    overdue: overdue || 0,
    openInvestigations: 0,
    pendingApprovals: 0,
  };
}

export async function fetchCorrectiveActionStats(tenantId: string) {
  const { count: total } = await (supabase as any).from('corrective_actions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  const { count: open } = await (supabase as any).from('corrective_actions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .not('status', 'in', '("completed","verified","cancelled")');

  return { total: total || 0, open: open || 0, overdue: 0 };
}

export async function fetchGatePassStats(tenantId: string) {
  const { count: total } = await (supabase as any).from('gate_passes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  return { total: total || 0, open: 0, overdue: 0, pendingApprovals: 0, todayActive: 0 };
}

export async function fetchInspectionStats(tenantId: string) {
  const { count: total } = await (supabase as any).from('inspection_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  return { total: total || 0, open: 0, overdue: 0, scheduled: 0, pendingActions: 0 };
}

export async function fetchContractorStats(tenantId: string) {
  const { count: total } = await (supabase as any).from('contractor_companies')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  return { total: total || 0, open: 0, overdue: 0 };
}

export async function fetchInductionStats(tenantId: string) {
  return { total: 0, open: 0, overdue: 0 };
}

export async function fetchUserStats(tenantId: string) {
  const { count: total } = await (supabase as any).from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  return { total: total || 0, open: 0, overdue: 0 };
}
