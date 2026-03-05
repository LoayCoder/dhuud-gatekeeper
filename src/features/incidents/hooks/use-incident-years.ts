import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Fetches distinct years from the incidents table for the current tenant.
 * Returns sorted descending (latest year first).
 */
export function useIncidentYears() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["incident-years", tenantId],
    queryFn: async (): Promise<number[]> => {
      const { data, error } = await supabase
        .rpc("get_auth_tenant_id_bypass")
        .then(async (tenantResult) => {
          // Use a raw query via RPC or direct select
          return supabase
            .from("incidents")
            .select("occurred_at")
            .is("deleted_at", null)
            .order("occurred_at", { ascending: false });
        });

      if (error) throw error;

      // Extract distinct years from occurred_at
      const yearSet = new Set<number>();
      (data || []).forEach((row: { occurred_at: string }) => {
        if (row.occurred_at) {
          const year = new Date(row.occurred_at).getFullYear();
          if (!isNaN(year)) yearSet.add(year);
        }
      });

      const years = Array.from(yearSet).sort((a, b) => b - a);
      return years;
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
