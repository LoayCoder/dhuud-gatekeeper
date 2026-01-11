import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContractorRepresentative } from "./use-contractor-portal";
import { useAuth } from "@/contexts/AuthContext";

export interface ContractorPortalAuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  ip_address: string | null;
}

export interface AuditLogFilters {
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Hook to fetch audit logs for the contractor representative's company.
 * Filters by entity types: contractor_worker and material_gate_pass
 */
export function useContractorPortalAuditLogs(filters: AuditLogFilters = {}, limit = 50) {
  const { data: rep } = useContractorRepresentative();
  const { profile } = useAuth();
  const companyId = rep?.company_id;
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-portal-audit-logs", companyId, filters, limit],
    queryFn: async () => {
      if (!companyId || !tenantId) return [];

      // First, get all worker IDs for this company
      const { data: workers } = await supabase
        .from("contractor_workers")
        .select("id")
        .eq("company_id", companyId)
        .is("deleted_at", null);

      // Get all gate pass IDs for this company
      const { data: gatePasses } = await supabase
        .from("material_gate_passes")
        .select("id")
        .eq("company_id", companyId)
        .is("deleted_at", null);

      const workerIds = workers?.map((w) => w.id) || [];
      const gatePassIds = gatePasses?.map((g) => g.id) || [];
      const allEntityIds = [...workerIds, ...gatePassIds];

      if (allEntityIds.length === 0) return [];

      // Query audit logs for these entities
      let query = supabase
        .from("contractor_module_audit_logs")
        .select(`
          id, entity_type, entity_id, action, actor_id, 
          old_value, new_value, created_at, ip_address
        `)
        .eq("tenant_id", tenantId)
        .in("entity_type", ["contractor_worker", "material_gate_pass"])
        .in("entity_id", allEntityIds)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filters.action) {
        query = query.eq("action", filters.action);
      }
      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }

      const { data: logs, error } = await query;
      if (error) throw error;

      // Fetch actor names
      const actorIds = [...new Set((logs || []).map((l) => l.actor_id).filter(Boolean))];
      let actorMap: Record<string, string> = {};

      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", actorIds);

        if (profiles) {
          actorMap = profiles.reduce((acc, p) => {
            acc[p.id] = p.full_name || "Unknown";
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return (logs || []).map((log) => ({
        ...log,
        actor_name: log.actor_id ? actorMap[log.actor_id] || "Unknown" : "System",
      })) as ContractorPortalAuditLog[];
    },
    enabled: !!companyId && !!tenantId,
  });
}
