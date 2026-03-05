import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AssetAuditLogEntry {
  id: string;
  action: string;
  asset_id: string;
  asset_name: string;
  asset_code: string;
  actor_id: string | null;
  actor_name: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  actorId?: string;
}

export interface AuditLogStats {
  totalChanges: number;
  created: number;
  updated: number;
  deleted: number;
  locationChanged: number;
}

export function useAssetAuditLogViewer(filters: AuditLogFilters = {}, page: number = 1, pageSize: number = 20) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["asset-audit-log-viewer", profile?.tenant_id, filters, page, pageSize],
    queryFn: async (): Promise<{ data: AssetAuditLogEntry[]; totalCount: number }> => {
      if (!profile?.tenant_id) {
        return { data: [], totalCount: 0 };
      }

      let query = supabase
        .from("asset_audit_logs")
        .select(`
          id,
          action,
          asset_id,
          actor_id,
          old_value,
          new_value,
          ip_address,
          created_at,
          hsse_assets!inner(name, asset_code),
          profiles!asset_audit_logs_actor_id_fkey(full_name)
        `, { count: "exact" })
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.action) {
        query = query.eq("action", filters.action);
      }

      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }

      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endDate.toISOString());
      }

      if (filters.actorId) {
        query = query.eq("actor_id", filters.actorId);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data
      const transformedData: AssetAuditLogEntry[] = (data || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        asset_id: log.asset_id,
        asset_name: log.hsse_assets?.name || "Unknown",
        asset_code: log.hsse_assets?.asset_code || "N/A",
        actor_id: log.actor_id,
        actor_name: log.profiles?.full_name || null,
        old_value: log.old_value,
        new_value: log.new_value,
        ip_address: log.ip_address,
        created_at: log.created_at,
      }));

      // Filter by search term (asset name/code) - done client-side for simplicity
      let filteredData = transformedData;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = transformedData.filter(
          (log) =>
            log.asset_name.toLowerCase().includes(searchLower) ||
            log.asset_code.toLowerCase().includes(searchLower)
        );
      }

      return { data: filteredData, totalCount: count || 0 };
    },
    enabled: !!profile?.tenant_id,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useAssetAuditLogStats(days: number = 7) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["asset-audit-log-stats", profile?.tenant_id, days],
    queryFn: async (): Promise<AuditLogStats> => {
      if (!profile?.tenant_id) {
        return { totalChanges: 0, created: 0, updated: 0, deleted: 0, locationChanged: 0 };
      }

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const { data, error } = await supabase
        .from("asset_audit_logs")
        .select("action")
        .eq("tenant_id", profile.tenant_id)
        .gte("created_at", fromDate.toISOString());

      if (error) throw error;

      const stats: AuditLogStats = {
        totalChanges: data?.length || 0,
        created: 0,
        updated: 0,
        deleted: 0,
        locationChanged: 0,
      };

      (data || []).forEach((log) => {
        switch (log.action) {
          case "created":
            stats.created++;
            break;
          case "updated":
            stats.updated++;
            break;
          case "deleted":
            stats.deleted++;
            break;
          case "location_changed":
            stats.locationChanged++;
            break;
        }
      });

      return stats;
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useAuditLogActors() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["audit-log-actors", profile?.tenant_id],
    queryFn: async (): Promise<{ id: string; name: string }[]> => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from("asset_audit_logs")
        .select("actor_id, profiles!asset_audit_logs_actor_id_fkey(full_name)")
        .eq("tenant_id", profile.tenant_id)
        .not("actor_id", "is", null);

      if (error) throw error;

      // Get unique actors
      const actorMap = new Map<string, string>();
      (data || []).forEach((log: any) => {
        if (log.actor_id && log.profiles?.full_name) {
          actorMap.set(log.actor_id, log.profiles.full_name);
        }
      });

      return Array.from(actorMap.entries()).map(([id, name]) => ({ id, name }));
    },
    enabled: !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
