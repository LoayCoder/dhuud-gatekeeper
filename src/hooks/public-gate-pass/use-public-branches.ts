import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PublicBranchInfo } from "@/types/public-gate-pass.types";

/**
 * Hook to fetch branches for a tenant (for public gate pass form)
 * This works without authentication
 */
export function usePublicBranches(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["public-branches", tenantId],
    queryFn: async (): Promise<PublicBranchInfo[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("branches")
        .select("id, name, address, google_maps_url")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching branches:", error);
        return [];
      }

      return (data || []) as PublicBranchInfo[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
