import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface ContractorSiteRep {
  id: string;
  company_id: string;
  full_name: string;
  national_id: string | null;
  mobile_number: string;
  email: string | null;
  is_primary: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteRepInput {
  full_name: string;
  national_id: string;
  mobile_number: string;
  phone?: string;
  email?: string;
  nationality?: string;
  photo_path?: string | null;
  status?: 'active' | 'inactive';
}

/**
 * Hook to fetch the primary representative for a specific company
 * Now reads from contractor_representatives (is_primary=true)
 */
export function useContractorSiteRep(companyId: string | null) {
  return useQuery({
    queryKey: ["contractor-rep", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("contractor_representatives")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_primary", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      return data as ContractorSiteRep | null;
    },
    enabled: !!companyId,
  });
}

/**
 * Hook to upsert (create or update) a primary representative for a company
 * Now writes to contractor_representatives (is_primary=true)
 */
export function useUpsertSiteRep() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
    }: {
      companyId: string;
      data: SiteRepInput;
    }) => {
      if (!profile?.tenant_id) {
        throw new Error("No tenant ID available");
      }

      // Check if primary rep already exists for this company
      const { data: existing } = await supabase
        .from("contractor_representatives")
        .select("id")
        .eq("company_id", companyId)
        .eq("is_primary", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data: updated, error } = await supabase
          .from("contractor_representatives")
          .update({
            full_name: data.full_name,
            national_id: data.national_id,
            mobile_number: data.mobile_number,
            email: data.email || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Create new
        const { data: created, error } = await supabase
          .from("contractor_representatives")
          .insert({
            tenant_id: profile.tenant_id,
            company_id: companyId,
            full_name: data.full_name,
            national_id: data.national_id,
            mobile_number: data.mobile_number,
            email: data.email || null,
            is_primary: true,
          })
          .select()
          .single();

        if (error) throw error;
        return created;
      }
    },
    onSuccess: async (result, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-rep", companyId] });
      queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-representatives-for-linking", companyId] });
    },
    onError: (error) => {
      console.error("[useUpsertSiteRep] Error:", error);
      toast.error(t("contractors.messages.siteRepSaveFailed", "Failed to save representative"));
    },
  });
}
