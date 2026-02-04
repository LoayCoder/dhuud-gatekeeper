import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PublicTenantInfo } from "@/types/public-gate-pass.types";

/**
 * Hook to fetch tenant info by slug for public pages
 * This works without authentication
 */
export function useTenantBySlug(tenantSlug: string | undefined) {
  return useQuery({
    queryKey: ["public-tenant", tenantSlug],
    queryFn: async (): Promise<PublicTenantInfo | null> => {
      if (!tenantSlug) return null;

      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url, brand_color, allow_public_gate_pass_requests")
        .eq("slug", tenantSlug)
        .single();

      if (error) {
        console.error("Error fetching tenant:", error);
        return null;
      }

      return data as PublicTenantInfo;
    },
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
