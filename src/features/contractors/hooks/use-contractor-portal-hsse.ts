import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CLOSED_STATUSES = [
  'closed', 'no_investigation_required', 'investigation_closed', 'closed_rejected_approved_by_hsse',
  'hsse_enforced', 'contractor_violation_enforced', 'contractor_violation_approved_fine',
  'contractor_violation_cancelled', 'contractor_violation_warning', 'contractor_violation_terminated',
  'upgraded_to_incident',
];

const REJECTED_STATUSES = ['expert_rejected', 'manager_rejected', 'dept_rep_rejected', 'rejected_invalid'];

const TERMINAL_STATUSES = [...CLOSED_STATUSES, ...REJECTED_STATUSES];

const ACTION_CLOSED_STATUSES = ['closed', 'verified'];

export interface HSSEObservationStats {
  total: number;
  open: number;
  closed: number;
  recent: Array<{
    id: string;
    title: string;
    incident_date: string;
    status: string;
    severity_v2: string | null;
  }>;
}

export interface HSSEIncidentStats {
  total: number;
  bySeverity: Record<string, number>;
  highSeverityCount: number;
  recent: Array<{
    id: string;
    title: string;
    incident_date: string;
    status: string;
    severity_v2: string | null;
  }>;
}

export interface HSSEActionStats {
  total: number;
  overdue: number;
  upcoming: number;
  recent: Array<{
    id: string;
    title: string;
    due_date: string;
    status: string;
    assigned_to: string | null;
    assignee_name?: string;
  }>;
}

export interface HSSEViolationStats {
  total: number;
  active: number;
  byFinalStatus: Record<string, number>;
  recent: Array<{
    id: string;
    incident_id: string | null;
    violation_type_id: string | null;
    violation_type_name?: string;
    final_status: string | null;
    total_fine_amount: number | null;
    created_at: string;
  }>;
}

export function useContractorPortalObservations(companyId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-portal-observations", companyId],
    queryFn: async (): Promise<HSSEObservationStats> => {
      if (!companyId || !tenantId) return { total: 0, open: 0, closed: 0, recent: [] };

      const { data, error } = await supabase
        .from("incidents")
        .select("id, title, occurred_at, status, severity_v2")
        .eq("related_contractor_company_id", companyId)
        .eq("tenant_id", tenantId)
        .eq("event_type", "observation")
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      const items = data || [];
      const closed = items.filter(i => TERMINAL_STATUSES.includes(i.status)).length;

      return {
        total: items.length,
        open: items.length - closed,
        closed,
        recent: items.slice(0, 5),
      };
    },
    enabled: !!companyId && !!tenantId,
  });
}

export function useContractorPortalIncidents(companyId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-portal-incidents", companyId],
    queryFn: async (): Promise<HSSEIncidentStats> => {
      if (!companyId || !tenantId) return { total: 0, bySeverity: {}, highSeverityCount: 0, recent: [] };

      const { data, error } = await supabase
        .from("incidents")
        .select("id, title, occurred_at, status, severity_v2")
        .eq("related_contractor_company_id", companyId)
        .eq("tenant_id", tenantId)
        .eq("event_type", "incident")
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      const items = data || [];

      const bySeverity: Record<string, number> = {};
      let highSeverityCount = 0;
      for (const item of items) {
        const sev = item.severity_v2 || 'unknown';
        bySeverity[sev] = (bySeverity[sev] || 0) + 1;
        if (['L3', 'L4', 'L5'].includes(sev)) highSeverityCount++;
      }

      return {
        total: items.length,
        bySeverity,
        highSeverityCount,
        recent: items.slice(0, 5),
      };
    },
    enabled: !!companyId && !!tenantId,
  });
}

export function useContractorPortalActions(companyId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-portal-actions", companyId],
    queryFn: async (): Promise<HSSEActionStats> => {
      if (!companyId || !tenantId) return { total: 0, overdue: 0, upcoming: 0, recent: [] };

      // Step 1: Get incident IDs linked to this contractor
      const { data: incidents, error: incErr } = await supabase
        .from("incidents")
        .select("id")
        .eq("related_contractor_company_id", companyId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (incErr) throw incErr;
      const incidentIds = (incidents || []).map(i => i.id);
      if (incidentIds.length === 0) return { total: 0, overdue: 0, upcoming: 0, recent: [] };

      // Step 2: Get corrective actions for those incidents
      const { data: actions, error: actErr } = await supabase
        .from("corrective_actions")
        .select("id, title, due_date, status, assigned_to, assignee:profiles!corrective_actions_assigned_to_fkey(full_name)")
        .in("incident_id", incidentIds)
        .is("deleted_at", null)
        .order("due_date", { ascending: true })
        .limit(100);

      if (actErr) throw actErr;
      const items = actions || [];

      const now = new Date().toISOString();
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      const sevenDays = sevenDaysLater.toISOString();

      let overdue = 0;
      let upcoming = 0;
      for (const a of items) {
        const isClosed = ACTION_CLOSED_STATUSES.includes(a.status);
        if (!isClosed && a.due_date && a.due_date < now) overdue++;
        if (!isClosed && a.due_date && a.due_date >= now && a.due_date <= sevenDays) upcoming++;
      }

      return {
        total: items.length,
        overdue,
        upcoming,
        recent: items.slice(0, 5).map(a => ({
          id: a.id,
          title: a.title,
          due_date: a.due_date,
          status: a.status,
          assigned_to: a.assigned_to,
          assignee_name: (a.assignee as any)?.full_name || undefined,
        })),
      };
    },
    enabled: !!companyId && !!tenantId,
  });
}

export function useContractorPortalViolations(companyId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-portal-violations", companyId],
    queryFn: async (): Promise<HSSEViolationStats> => {
      if (!companyId || !tenantId) return { total: 0, active: 0, byFinalStatus: {}, recent: [] };

      const { data, error } = await supabase
        .from("contractor_violation_summary")
        .select(`
          id, incident_id, violation_type_id, final_status, total_fine_amount, created_at,
          violation_type:violation_types(name, name_ar)
        `)
        .eq("contractor_company_id", companyId)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      const items = data || [];

      const byFinalStatus: Record<string, number> = {};
      let active = 0;
      for (const v of items) {
        const fs = v.final_status || 'pending';
        byFinalStatus[fs] = (byFinalStatus[fs] || 0) + 1;
        if (!v.final_status || v.final_status === 'pending') active++;
      }

      return {
        total: items.length,
        active,
        byFinalStatus,
        recent: items.slice(0, 5).map(v => ({
          id: v.id,
          incident_id: v.incident_id,
          violation_type_id: v.violation_type_id,
          violation_type_name: (v.violation_type as any)?.name || undefined,
          final_status: v.final_status,
          total_fine_amount: v.total_fine_amount,
          created_at: v.created_at,
        })),
      };
    },
    enabled: !!companyId && !!tenantId,
  });
}

/** Combined hook for all HSSE stats */
export function useContractorPortalHSSEStats(companyId: string | undefined) {
  const observations = useContractorPortalObservations(companyId);
  const incidents = useContractorPortalIncidents(companyId);
  const actions = useContractorPortalActions(companyId);
  const violations = useContractorPortalViolations(companyId);

  return {
    observations: observations.data,
    incidents: incidents.data,
    actions: actions.data,
    violations: violations.data,
    isLoading: observations.isLoading || incidents.isLoading || actions.isLoading || violations.isLoading,
    isError: observations.isError || incidents.isError || actions.isError || violations.isError,
  };
}
