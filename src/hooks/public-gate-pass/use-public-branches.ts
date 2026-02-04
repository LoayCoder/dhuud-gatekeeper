import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PublicBranch } from "@/types/public-gate-pass.types";

// Re-export from centralized types file
export type { PublicBranch } from "@/types/public-gate-pass.types";

/**
 * Fetch branches for a tenant that has public gate pass enabled
 * This hook works without authentication
 */
export function usePublicBranches(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["public-branches", tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error("Tenant ID is required");

      const { data, error } = await supabase
        .from("branches")
        .select(`
          id,
          name,
          location,
          address,
          latitude,
          longitude,
          contact_phone,
          contact_email
        `)
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as PublicBranch[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Get a single branch by ID for public display
 */
export function usePublicBranch(branchId: string | undefined) {
  return useQuery({
    queryKey: ["public-branch", branchId],
    queryFn: async () => {
      if (!branchId) throw new Error("Branch ID is required");

      const { data, error } = await supabase
        .from("branches")
        .select(`
          id,
          name,
          location,
          address,
          latitude,
          longitude,
          contact_phone,
          contact_email
        `)
        .eq("id", branchId)
        .single();

      if (error) throw error;
      return data as PublicBranch;
    },
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}
