import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchFilter } from "@/hooks/use-branch-filter";
import type { AssetStats, ConditionDistribution, CategoryDistribution, OverdueItem } from "./types";

export function useAssetDashboardStats() {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    const { queryKey: branchQueryKey } = useBranchFilter();

    return useQuery({
        queryKey: ["asset-dashboard-stats", tenantId, ...branchQueryKey],
        queryFn: async () => {
            if (!tenantId) throw new Error("No tenant");
            const { data, error } = await supabase.rpc('get_asset_dashboard_stats', { p_tenant_id: tenantId });
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
    const { queryKey: branchQueryKey } = useBranchFilter();

    return useQuery({
        queryKey: ["asset-condition-distribution", tenantId, ...branchQueryKey],
        queryFn: async () => {
            if (!tenantId) throw new Error("No tenant");
            const { data, error } = await supabase.rpc('get_asset_dashboard_stats', { p_tenant_id: tenantId });
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
    const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();

    return useQuery({
        queryKey: ["asset-category-distribution", profile?.tenant_id, ...branchQueryKey],
        queryFn: async () => {
            if (!profile?.tenant_id) throw new Error("No tenant");
            let query = supabase
                .from("hsse_assets")
                .select(`category_id, asset_categories!inner(name, name_ar)`)
                .eq("tenant_id", profile.tenant_id)
                .is("deleted_at", null);
            if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
                query = branchIds.length === 1
                    ? query.eq("branch_id", branchIds[0])
                    : query.in("branch_id", branchIds);
            }
            const { data, error } = await query;
            if (error) throw error;
            const categoryMap = new Map<string, { name: string; name_ar: string | null; count: number }>();
            data.forEach((asset) => {
                const catId = asset.category_id;
                const category = asset.asset_categories as { name: string; name_ar: string | null };
                if (categoryMap.has(catId)) {
                    categoryMap.get(catId)!.count++;
                } else {
                    categoryMap.set(catId, { name: category.name, name_ar: category.name_ar, count: 1 });
                }
            });
            const distribution: CategoryDistribution[] = Array.from(categoryMap.entries()).map(
                ([category_id, { name, count }]) => ({ category_id, category_name: name, count })
            );
            return distribution.sort((a, b) => b.count - a.count);
        },
        enabled: !!profile?.tenant_id,
    });
}

export function useOverdueInspections() {
    const { profile } = useAuth();
    const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();

    return useQuery({
        queryKey: ["overdue-inspections", profile?.tenant_id, ...branchQueryKey],
        queryFn: async () => {
            if (!profile?.tenant_id) throw new Error("No tenant");
            const today = new Date().toISOString().split("T")[0];
            let query = supabase.from("hsse_assets")
                .select("id, name, asset_code, next_inspection_due")
                .eq("tenant_id", profile.tenant_id).eq("status", "active")
                .is("deleted_at", null).lt("next_inspection_due", today)
                .order("next_inspection_due", { ascending: true }).limit(10);
            if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
                query = branchIds.length === 1 ? query.eq("branch_id", branchIds[0]) : query.in("branch_id", branchIds);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data.map((asset) => {
                const dueDate = new Date(asset.next_inspection_due!);
                const daysOverdue = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                return { id: asset.id, name: asset.name, asset_code: asset.asset_code, due_date: asset.next_inspection_due!, days_overdue: daysOverdue } as OverdueItem;
            });
        },
        enabled: !!profile?.tenant_id,
    });
}

export function useOverdueMaintenance() {
    const { profile } = useAuth();
    const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();

    return useQuery({
        queryKey: ["overdue-maintenance", profile?.tenant_id, ...branchQueryKey],
        queryFn: async () => {
            if (!profile?.tenant_id) throw new Error("No tenant");
            const today = new Date().toISOString().split("T")[0];
            let query = supabase.from("asset_maintenance_schedules")
                .select(`id, next_due, schedule_type, hsse_assets!inner(id, name, asset_code)`)
                .eq("tenant_id", profile.tenant_id).eq("is_active", true)
                .is("deleted_at", null).lt("next_due", today)
                .order("next_due", { ascending: true }).limit(10);
            if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
                query = branchIds.length === 1 ? query.eq("branch_id", branchIds[0]) : query.in("branch_id", branchIds);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data.map((schedule) => {
                const dueDate = new Date(schedule.next_due!);
                const daysOverdue = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                const asset = schedule.hsse_assets as { id: string; name: string; asset_code: string };
                return { id: asset.id, name: asset.name, asset_code: asset.asset_code, due_date: schedule.next_due!, days_overdue: daysOverdue } as OverdueItem;
            });
        },
        enabled: !!profile?.tenant_id,
    });
}

export function useRecentAssetActivity() {
    const { profile } = useAuth();
    const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();

    return useQuery({
        queryKey: ["recent-asset-activity", profile?.tenant_id, ...branchQueryKey],
        queryFn: async () => {
            if (!profile?.tenant_id) throw new Error("No tenant");
            let query = supabase.from("asset_audit_logs")
                .select(`id, action, created_at, asset_id, actor_id, hsse_assets!inner(name, asset_code), profiles!asset_audit_logs_actor_id_fkey(full_name)`)
                .eq("tenant_id", profile.tenant_id)
                .order("created_at", { ascending: false }).limit(10);
            if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
                query = branchIds.length === 1 ? query.eq("branch_id", branchIds[0]) : query.in("branch_id", branchIds);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data.map((log) => ({
                id: log.id, action: log.action, created_at: log.created_at,
                asset_name: (log.hsse_assets as { name: string; asset_code: string }).name,
                asset_code: (log.hsse_assets as { name: string; asset_code: string }).asset_code,
                actor_name: (log.profiles as { full_name: string | null })?.full_name || "System",
            }));
        },
        enabled: !!profile?.tenant_id,
    });
}
