import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export interface ContractorSafetyOfficer {
  id: string;
  company_id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface SafetyOfficerFormData {
  id?: string;
  name: string;
  phone: string;
  email: string;
  is_primary: boolean;
}

export function useContractorSafetyOfficers(companyId: string | null) {
  return useQuery({
    queryKey: ["contractor-safety-officers", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("contractor_safety_officers")
        .select("id, company_id, tenant_id, name, phone, email, is_primary, created_at, updated_at")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ContractorSafetyOfficer[];
    },
    enabled: !!companyId,
  });
}

export function useSyncContractorSafetyOfficers() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      companyId,
      officers,
    }: {
      companyId: string;
      officers: SafetyOfficerFormData[];
    }) => {
      // Get tenant_id from user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) throw new Error("No tenant found");

      // Fetch existing officers
      const { data: existingOfficers, error: fetchError } = await supabase
        .from("contractor_safety_officers")
        .select("id")
        .eq("company_id", companyId)
        .is("deleted_at", null);

      if (fetchError) throw fetchError;

      const existingIds = new Set(existingOfficers?.map((o) => o.id) || []);
      const newOfficerIds = new Set(officers.filter((o) => o.id).map((o) => o.id));

      // Determine which officers to delete (soft delete)
      const toDelete = [...existingIds].filter((id) => !newOfficerIds.has(id));

      // Soft delete removed officers
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("contractor_safety_officers")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", toDelete);

        if (deleteError) throw deleteError;
      }

      // Upsert officers
      for (const officer of officers) {
        if (officer.id && existingIds.has(officer.id)) {
          // Update existing
          const { error: updateError } = await supabase
            .from("contractor_safety_officers")
            .update({
              name: officer.name,
              phone: officer.phone || null,
              email: officer.email || null,
              is_primary: officer.is_primary,
              updated_at: new Date().toISOString(),
            })
            .eq("id", officer.id);

          if (updateError) throw updateError;
        } else {
          // Create new
          const { error: insertError } = await supabase
            .from("contractor_safety_officers")
            .insert({
              company_id: companyId,
              tenant_id: profile.tenant_id,
              name: officer.name,
              phone: officer.phone || null,
              email: officer.email || null,
              is_primary: officer.is_primary,
            });

          if (insertError) throw insertError;
        }
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-safety-officers", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["contractor-company-details", variables.companyId] });
    },
    onError: (error) => {
      console.error("Error syncing safety officers:", error);
      toast.error(t("contractors.companies.syncError", "Failed to save safety officers"));
    },
  });
}
