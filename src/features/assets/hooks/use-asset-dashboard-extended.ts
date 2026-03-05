import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Hook for expiring warranties count (next 30 days)
export function useExpiringWarranties() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["expiring-warranties-count", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const futureDate = thirtyDaysFromNow.toISOString().split("T")[0];
      
      const { data, error, count } = await supabase
        .from("hsse_assets")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .not("warranty_expiry_date", "is", null)
        .gte("warranty_expiry_date", today)
        .lte("warranty_expiry_date", futureDate);
      
      if (error) throw error;
      
      return count || 0;
    },
    enabled: !!profile?.tenant_id,
  });
}

// Hook for low stock parts count
export function useLowStockCount() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["low-stock-count", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      const { data, error } = await supabase
        .from("maintenance_parts")
        .select("id, quantity_in_stock, reorder_point")
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .not("reorder_point", "is", null);
      
      if (error) throw error;
      
      // Filter parts where quantity_in_stock <= reorder_point
      const lowStockCount = (data || []).filter(
        (part) => (part.quantity_in_stock || 0) <= (part.reorder_point || 0)
      ).length;
      
      return lowStockCount;
    },
    enabled: !!profile?.tenant_id,
  });
}

// Hook for depreciation totals
export function useDepreciationTotals() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["depreciation-totals", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      // Get current month's start and end
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("asset_depreciation_schedules")
        .select("depreciation_amount, accumulated_depreciation")
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .gte("period_start", monthStart)
        .lte("period_end", monthEnd);
      
      if (error) throw error;
      
      const monthlyTotal = (data || []).reduce((sum, item) => sum + Number(item.depreciation_amount || 0), 0);
      const accumulatedTotal = (data || []).reduce((sum, item) => sum + Number(item.accumulated_depreciation || 0), 0);
      
      return {
        monthlyDepreciation: monthlyTotal,
        accumulatedDepreciation: accumulatedTotal,
      };
    },
    enabled: !!profile?.tenant_id,
  });
}

// Hook for asset trend data (last 6 months)
export function useAssetTrendData() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["asset-trend-data", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      // Get last 6 months of data
      const months: { month: string; label: string; assets: number; maintenance: number }[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthLabel = monthStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        
        // Count assets created up to this month
        const { count: assetCount } = await supabase
          .from("hsse_assets")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id)
          .is("deleted_at", null)
          .lte("created_at", monthEnd.toISOString());
        
        // Count maintenance records for this month
        const { count: maintenanceCount } = await supabase
          .from("asset_maintenance_history")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id)
          .is("deleted_at", null)
          .gte("performed_date", monthStart.toISOString())
          .lte("performed_date", monthEnd.toISOString());
        
        months.push({
          month: monthStart.toISOString().slice(0, 7),
          label: monthLabel,
          assets: assetCount || 0,
          maintenance: maintenanceCount || 0,
        });
      }
      
      return months;
    },
    enabled: !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for pending purchase requests
export function usePendingPurchaseRequests() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["pending-purchase-requests", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      const { data, error, count } = await supabase
        .from("asset_purchase_requests")
        .select("*", { count: "exact" })
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "pending")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      return {
        requests: data || [],
        total: count || 0,
      };
    },
    enabled: !!profile?.tenant_id,
  });
}
