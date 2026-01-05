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
  reporter_name: string | null;
  branch_name: string | null;
}

const SELECT_INCIDENT_FIELDS = `
  id, reference_id, title, event_type, severity, status, occurred_at,
  reporter:profiles!incidents_reporter_id_fkey(full_name),
  branch:branches(name)
`;

function mapToEvent(item: Record<string, unknown>): DrilldownEvent {
  return {
    id: item.id as string,
    reference_id: item.reference_id as string,
    title: item.title as string,
    event_type: item.event_type as string,
    severity: item.severity as string | null,
    status: item.status as string,
    occurred_at: item.occurred_at as string,
    reporter_name: (item.reporter as { full_name?: string } | null)?.full_name || null,
    branch_name: (item.branch as { name?: string } | null)?.name || null,
  };
}

export function useDrilldownEvents(filters: DrillDownFilter, enabled: boolean) {
  return useQuery({
    queryKey: ["drilldown-events", filters],
    queryFn: async () => {
      if (filters.rootCauseCategory) {
        return fetchIncidentsByRootCause(filters.rootCauseCategory);
      }
      
      // Use type assertion to avoid deep type instantiation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      let query = db
        .from("incidents")
        .select(SELECT_INCIDENT_FIELDS)
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false })
        .limit(50);

      if (filters.eventType) query = query.eq("event_type", filters.eventType);
      if (filters.severity) query = query.eq("severity", filters.severity);
      if (filters.status) query = query.eq("status", filters.status);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data, error } = await db
    .from("incidents")
    .select(SELECT_INCIDENT_FIELDS)
    .in("id", matchingIncidentIds)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data || []).map(mapToEvent);
}
