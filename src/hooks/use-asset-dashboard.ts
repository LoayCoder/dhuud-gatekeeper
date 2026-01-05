import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AssetStats {
  total: number;
  active: number;
  inactive: number;
  under_maintenance: number;
  decommissioned: number;
}

interface ConditionDistribution {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
  critical: number;
}

interface CategoryDistribution {
  category_id: string;
  category_name: string;
  count: number;
}

interface OverdueItem {
  id: string;
  name: string;
  asset_code: string;
  due_date: string;
  days_overdue: number;
}

export function useAssetDashboardStats() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  
  return useQuery({
    queryKey: ["asset-dashboard-stats", tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      
      // Use server-side RPC function for O(1) performance
      const { data, error } = await supabase
        .rpc('get_asset_dashboard_stats', { p_tenant_id: tenantId });
      
      if (error) throw error;
      
      const row = (data as Record<string, unknown>[])?.[0] || {};
      const stats: AssetStats = {
        total: Number(row.total_assets) || 0,
        active: Number(row.active_count) || 0,
        inactive: Number(row.inactive_count) || 0,
        under_maintenance: Number(row.under_maintenance_count) || 0,
        decommissioned: Number(row.missing_count) || 0,
      };
      
      return stats;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssetConditionDistribution() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  
  return useQuery({
    queryKey: ["asset-condition-distribution", tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      
      const { data, error } = await supabase
        .rpc('get_asset_dashboard_stats', { p_tenant_id: tenantId });
      
      if (error) throw error;
      
      const row = (data as Record<string, unknown>[])?.[0] || {};
      const distribution: ConditionDistribution = {
        excellent: Number(row.excellent_condition) || 0,
        good: Number(row.good_condition) || 0,
        fair: Number(row.fair_condition) || 0,
        poor: Number(row.poor_condition) || 0,
        critical: Number(row.critical_condition) || 0,
      };
      
      return distribution;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssetCategoryDistribution() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["asset-category-distribution", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      const { data, error } = await supabase
        .from("hsse_assets")
        .select(`
          category_id,
          asset_categories!inner(name, name_ar)
        `)
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null);
      
      if (error) throw error;
      
      // Group by category
      const categoryMap = new Map<string, { name: string; name_ar: string | null; count: number }>();
      
      data.forEach((asset) => {
        const catId = asset.category_id;
        const category = asset.asset_categories as { name: string; name_ar: string | null };
        if (categoryMap.has(catId)) {
          categoryMap.get(catId)!.count++;
        } else {
          categoryMap.set(catId, {
            name: category.name,
            name_ar: category.name_ar,
            count: 1,
          });
        }
      });
      
      const distribution: CategoryDistribution[] = Array.from(categoryMap.entries()).map(
        ([category_id, { name, count }]) => ({
          category_id,
          category_name: name,
          count,
        })
      );
      
      return distribution.sort((a, b) => b.count - a.count);
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useOverdueInspections() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["overdue-inspections", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("hsse_assets")
        .select("id, name, asset_code, next_inspection_due")
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "active")
        .is("deleted_at", null)
        .lt("next_inspection_due", today)
        .order("next_inspection_due", { ascending: true })
        .limit(10);
      
      if (error) throw error;
      
      const overdueItems: OverdueItem[] = data.map((asset) => {
        const dueDate = new Date(asset.next_inspection_due!);
        const todayDate = new Date();
        const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: asset.id,
          name: asset.name,
          asset_code: asset.asset_code,
          due_date: asset.next_inspection_due!,
          days_overdue: daysOverdue,
        };
      });
      
      return overdueItems;
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useOverdueMaintenance() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["overdue-maintenance", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("asset_maintenance_schedules")
        .select(`
          id,
          next_due,
          schedule_type,
          hsse_assets!inner(id, name, asset_code)
        `)
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .lt("next_due", today)
        .order("next_due", { ascending: true })
        .limit(10);
      
      if (error) throw error;
      
      const overdueItems: OverdueItem[] = data.map((schedule) => {
        const dueDate = new Date(schedule.next_due!);
        const todayDate = new Date();
        const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const asset = schedule.hsse_assets as { id: string; name: string; asset_code: string };
        
        return {
          id: asset.id,
          name: asset.name,
          asset_code: asset.asset_code,
          due_date: schedule.next_due!,
          days_overdue: daysOverdue,
        };
      });
      
      return overdueItems;
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useRecentAssetActivity() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["recent-asset-activity", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      const { data, error } = await supabase
        .from("asset_audit_logs")
        .select(`
          id,
          action,
          created_at,
          asset_id,
          actor_id,
          hsse_assets!inner(name, asset_code),
          profiles!asset_audit_logs_actor_id_fkey(full_name)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      return data.map((log) => ({
        id: log.id,
        action: log.action,
        created_at: log.created_at,
        asset_name: (log.hsse_assets as { name: string; asset_code: string }).name,
        asset_code: (log.hsse_assets as { name: string; asset_code: string }).asset_code,
        actor_name: (log.profiles as { full_name: string | null })?.full_name || "System",
      }));
    },
    enabled: !!profile?.tenant_id,
  });
}
