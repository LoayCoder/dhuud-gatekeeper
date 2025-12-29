import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PTWType {
  id: string;
  tenant_id: string | null;
  name: string;
  name_ar: string | null;
  code: string;
  risk_level: string | null;
  requires_gas_test: boolean;
  requires_loto: boolean;
  validity_hours: number;
  icon_name: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export function usePTWTypes() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["ptw-types", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Fetch both tenant-specific types AND global templates (tenant_id is null)
      const { data, error } = await supabase
        .from("ptw_types")
        .select(`
          id, tenant_id, name, name_ar, code, risk_level, requires_gas_test,
          requires_loto, validity_hours, icon_name, color, is_active, sort_order, created_at
        `)
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order");

      if (error) throw error;
      return (data || []) as PTWType[];
    },
    enabled: !!tenantId,
  });
}
