import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export interface CrossBranchSummary {
  total_observations: number;
  cross_branch_count: number;
  same_branch_count: number;
  cross_branch_percentage: number;
}

export interface LocationBranchData {
  branch_id: string;
  branch_name: string;
  branch_name_ar: string | null;
  total: number;
  from_same_branch: number;
  from_other_branches: number;
}

export interface ReporterBranchData {
  branch_id: string;
  branch_name: string;
  branch_name_ar: string | null;
  total_reported: number;
  reported_at_home: number;
  reported_elsewhere: number;
}

export interface CrossBranchMatrixItem {
  location_branch_id: string;
  location_branch_name: string;
  location_branch_name_ar: string | null;
  reporter_branch_id: string;
  reporter_branch_name: string;
  reporter_branch_name_ar: string | null;
  count: number;
  is_cross_branch: boolean;
}

export interface CrossBranchAnalyticsData {
  summary: CrossBranchSummary;
  by_location_branch: LocationBranchData[];
  by_reporter_branch: ReporterBranchData[];
  cross_branch_matrix: CrossBranchMatrixItem[];
}

interface UseCrossBranchAnalyticsParams {
  startDate?: Date;
  endDate?: Date;
  locationBranchId?: string;
  reporterBranchId?: string;
}

export function useCrossBranchAnalytics({
  startDate,
  endDate,
  locationBranchId,
  reporterBranchId,
}: UseCrossBranchAnalyticsParams = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: [
      "cross-branch-analytics",
      tenantId,
      startDate?.toISOString(),
      endDate?.toISOString(),
      locationBranchId,
      reporterBranchId,
    ],
    queryFn: async (): Promise<CrossBranchAnalyticsData> => {
      if (!tenantId) {
        throw new Error("Tenant ID is required");
      }

      const { data, error } = await supabase.rpc("get_cross_branch_analytics", {
        p_tenant_id: tenantId,
        p_start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        p_end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
        p_location_branch_id: locationBranchId || null,
        p_reporter_branch_id: reporterBranchId || null,
      });

      if (error) {
        throw error;
      }

      // Parse the JSONB response
      const result = data as unknown as CrossBranchAnalyticsData;
      
      return {
        summary: result.summary || {
          total_observations: 0,
          cross_branch_count: 0,
          same_branch_count: 0,
          cross_branch_percentage: 0,
        },
        by_location_branch: result.by_location_branch || [],
        by_reporter_branch: result.by_reporter_branch || [],
        cross_branch_matrix: result.cross_branch_matrix || [],
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
    placeholderData: {
      summary: {
        total_observations: 0,
        cross_branch_count: 0,
        same_branch_count: 0,
        cross_branch_percentage: 0,
      },
      by_location_branch: [],
      by_reporter_branch: [],
      cross_branch_matrix: [],
    },
  });
}
