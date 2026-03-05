import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface ContractorSiteRep {
  id: string;
  company_id: string;
  full_name: string;
  national_id: string;
  mobile_number: string;
  phone: string | null;
  email: string | null;
  nationality: string | null;
  photo_path: string | null;
  status: 'active' | 'inactive';
  worker_id: string | null;
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
 * Hook to fetch the site representative for a specific company
 */
export function useContractorSiteRep(companyId: string | null) {
  return useQuery({
    queryKey: ["contractor-site-rep", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("contractor_site_representatives")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      return data as ContractorSiteRep | null;
    },
    enabled: !!companyId,
  });
}

/**
 * Hook to upsert (create or update) a site representative for a company
 */
export function useUpsertSiteRep() {
  const queryClient = useQueryClient();
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

      // Check if site rep already exists for this company
      const { data: existing } = await supabase
        .from("contractor_site_representatives")
        .select("id")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data: updated, error } = await supabase
          .from("contractor_site_representatives")
          .update({
            full_name: data.full_name,
            national_id: data.national_id,
            mobile_number: data.mobile_number,
            phone: data.phone || null,
            email: data.email || null,
            nationality: data.nationality || null,
            photo_path: data.photo_path || null,
            status: data.status || 'active',
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Create new
        const { data: created, error } = await supabase
          .from("contractor_site_representatives")
          .insert({
            tenant_id: profile.tenant_id,
            company_id: companyId,
            full_name: data.full_name,
            national_id: data.national_id,
            mobile_number: data.mobile_number,
            phone: data.phone || null,
            email: data.email || null,
            nationality: data.nationality || null,
            photo_path: data.photo_path || null,
            status: data.status || 'active',
          })
          .select()
          .single();

        if (error) throw error;
        return created;
      }
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-site-rep", companyId] });
      queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
    },
    onError: (error) => {
      console.error("[useUpsertSiteRep] Error:", error);
      toast.error("Failed to save site representative");
    },
  });
}

/**
 * Hook to sync site rep to contractor_workers table as well
 */
export function useSyncSiteRepToWorker() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      companyId,
      siteRepId,
      data,
    }: {
      companyId: string;
      siteRepId: string;
      data: SiteRepInput;
    }) => {
      if (!profile?.tenant_id) {
        throw new Error("No tenant ID available");
      }

      // Check if worker record exists for this site rep
      const { data: existingWorker } = await supabase
        .from("contractor_workers")
        .select("id")
        .eq("company_id", companyId)
        .eq("worker_type", "site_representative")
        .is("deleted_at", null)
        .maybeSingle();

      const workerData = {
        full_name: data.full_name,
        national_id: data.national_id,
        mobile_number: data.mobile_number,
        nationality: data.nationality || null,
        photo_path: data.photo_path || null,
      };

      if (existingWorker) {
        // Update existing worker
        const { error } = await supabase
          .from("contractor_workers")
          .update(workerData)
          .eq("id", existingWorker.id);

        if (error) throw error;

        // Link worker to site rep record
        await supabase
          .from("contractor_site_representatives")
          .update({ worker_id: existingWorker.id })
          .eq("id", siteRepId);

        return existingWorker.id;
      } else {
        // Create new worker
        const { data: newWorker, error } = await supabase
          .from("contractor_workers")
          .insert({
            tenant_id: profile.tenant_id,
            company_id: companyId,
            worker_type: "site_representative",
            approval_status: "pending",
            ...workerData,
          })
          .select("id")
          .single();

        if (error) throw error;

        // Link worker to site rep record
        await supabase
          .from("contractor_site_representatives")
          .update({ worker_id: newWorker.id })
          .eq("id", siteRepId);

        return newWorker.id;
      }
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers", companyId] });
      queryClient.invalidateQueries({ queryKey: ["contractor-site-rep", companyId] });
    },
  });
}