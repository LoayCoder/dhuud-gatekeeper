import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DrillDownFilter } from "@/hooks/use-dashboard-drilldown";

export interface DrilldownEvent {
  id: string;
  reference_id: string;
  title: string;
  event_type: string;
  severity: string | null;
  status: string;
  occurred_at: string;
  updated_at: string;
  reporter_name: string | null;
  branch_name: string | null;
  assignee_name: string | null;
}

const SELECT_INCIDENT_FIELDS = `
  id, reference_id, title, event_type, severity, severity_v2, status, occurred_at, updated_at,
  reporter:profiles!incidents_reporter_id_fkey(full_name),
  assignee:profiles!incidents_approval_manager_id_fkey(full_name),
  branch:branches!incidents_branch_id_fkey(name)
`;

function mapToEvent(item: Record<string, unknown>): DrilldownEvent {
  return {
    id: item.id as string,
    reference_id: item.reference_id as string,
    title: item.title as string,
    event_type: item.event_type as string,
    severity: (item.severity_v2 || item.severity) as string | null,
    status: item.status as string,
    occurred_at: item.occurred_at as string,
    updated_at: item.updated_at as string,
    reporter_name: (item.reporter as { full_name?: string } | null)?.full_name || null,
    branch_name: (item.branch as { name?: string } | null)?.name || null,
    assignee_name: (item.assignee as { full_name?: string } | null)?.full_name || null,
  };
}

export function useDrilldownEvents(filters: DrillDownFilter, enabled: boolean) {
  return useQuery({
    queryKey: ["drilldown-events", filters],
    queryFn: async () => {
      // HANDLE CORRECTIVE ACTIONS
      if (filters.eventType === 'corrective_action') {
        let query = supabase
          .from("corrective_actions")
          .select(`
            id, reference_id, title, status, priority, due_date, created_at, updated_at,
            assignee:profiles!corrective_actions_assigned_to_fkey(full_name)
          `)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);

        if (filters.customFilter === 'overdue') {
          query = query.lt('due_date', new Date().toISOString().split('T')[0])
            .not('status', 'in', '("verified","closed","rejected")');
        } else if (filters.customFilter === 'pending') {
          query = query.not('status', 'in', '("verified","closed","rejected")');
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((item: { id: string; reference_id: string; title: string; priority: string; status: string; created_at: string; updated_at?: string; assignee?: { full_name?: string } }) => ({
          id: item.id,
          reference_id: item.reference_id,
          title: item.title,
          event_type: 'corrective_action',
          severity: item.priority, // Map priority to severity
          status: item.status,
          occurred_at: item.created_at, // Map created_at to occurred_at
          updated_at: item.updated_at || item.created_at,
          reporter_name: null,
          branch_name: null,
          assignee_name: item.assignee?.full_name || null
        }));
      }

      // HANDLE ROOT CAUSE (Existing logic)
      if (filters.rootCauseCategory) {
        return fetchIncidentsByRootCause(filters.rootCauseCategory);
      }

      // HANDLE INCIDENTS (Existing logic)
      // Use type assertion to avoid deep type instantiation
      let query = supabase
        .from("incidents")
        .select(SELECT_INCIDENT_FIELDS)
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false })
        .limit(50);

      if (filters.eventType) query = query.eq("event_type", filters.eventType);
      if (filters.severity) query = query.eq("severity", filters.severity as any);
      if (filters.status) query = query.eq("status", filters.status as any);
      if (filters.branchId) query = query.eq("branch_id", filters.branchId);
      if (filters.siteId) query = query.eq("site_id", filters.siteId);
      if (filters.departmentId) query = query.eq("department_id", filters.departmentId);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(mapToEvent);
    },
    enabled,
  });
}

async function fetchIncidentsByRootCause(category: string): Promise<DrilldownEvent[]> {
  const { data: investigationsData, error: investigationsError } = await supabase
    .from("investigations")
    .select("incident_id, root_causes")
    .not("root_causes", "is", null);

  if (investigationsError) throw investigationsError;

  const matchingIncidentIds = (investigationsData || [])
    .filter((inv) => {
      const rootCauses = inv.root_causes as Array<{ category?: string }> | null;
      if (!rootCauses || !Array.isArray(rootCauses)) return false;
      return rootCauses.some((cause) => cause?.category === category);
    })
    .map((inv) => inv.incident_id);

  if (matchingIncidentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("incidents")
    .select(SELECT_INCIDENT_FIELDS)
    .in("id", matchingIncidentIds)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data || []).map(mapToEvent);
}
