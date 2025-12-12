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

export function useDrilldownEvents(filters: DrillDownFilter, enabled: boolean) {
  return useQuery({
    queryKey: ["drilldown-events", filters],
    queryFn: async () => {
      let query = supabase
        .from("incidents")
        .select(`
          id,
          reference_id,
          title,
          event_type,
          severity,
          status,
          occurred_at,
          reporter:profiles!incidents_reporter_id_fkey(full_name),
          branch:branches(name)
        `)
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false })
        .limit(50);

      if (filters.eventType) {
        query = query.eq("event_type", filters.eventType as "incident" | "observation");
      }
      if (filters.severity) {
        query = query.eq("severity", filters.severity as "critical" | "high" | "medium" | "low");
      }
      if (filters.status) {
        query = query.eq("status", filters.status as "submitted" | "closed" | "investigation_in_progress");
      }
      if (filters.branchId) {
        query = query.eq("branch_id", filters.branchId);
      }
      if (filters.siteId) {
        query = query.eq("site_id", filters.siteId);
      }
      if (filters.departmentId) {
        query = query.eq("department_id", filters.departmentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((item) => ({
        id: item.id,
        reference_id: item.reference_id,
        title: item.title,
        event_type: item.event_type,
        severity: item.severity,
        status: item.status,
        occurred_at: item.occurred_at,
        reporter_name: (item.reporter as { full_name: string } | null)?.full_name || null,
        branch_name: (item.branch as { name: string } | null)?.name || null,
      })) as DrilldownEvent[];
    },
    enabled,
  });
}
