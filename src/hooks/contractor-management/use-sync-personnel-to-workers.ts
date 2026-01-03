import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SiteRepFormData } from "@/components/contractors/SiteRepWorkerForm";
import { SafetyOfficerFullFormData } from "@/components/contractors/SafetyOfficerFullForm";

interface SyncPersonnelParams {
  companyId: string;
  tenantId: string;
  siteRep: SiteRepFormData | null;
  safetyOfficers: SafetyOfficerFullFormData[];
}

export function useSyncPersonnelToWorkers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, tenantId, siteRep, safetyOfficers }: SyncPersonnelParams) => {
      const results: { siteRepWorkerId?: string; officerWorkerIds: string[] } = {
        officerWorkerIds: [],
      };

      // Sync Site Representative to contractor_workers
      if (siteRep && siteRep.full_name && siteRep.national_id) {
        // Check if worker with this national_id already exists
        const { data: existingSiteRep } = await supabase
          .from("contractor_workers")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("national_id", siteRep.national_id)
          .is("deleted_at", null)
          .maybeSingle();

        if (existingSiteRep) {
          // Update existing worker
          const { error: updateError } = await supabase
            .from("contractor_workers")
            .update({
              company_id: companyId,
              full_name: siteRep.full_name,
              mobile_number: siteRep.mobile_number || siteRep.phone,
              nationality: siteRep.nationality || null,
              photo_path: siteRep.photo_path,
              worker_type: "site_representative",
              approval_status: "approved",
              approved_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSiteRep.id);

          if (updateError) {
            console.error("[useSyncPersonnelToWorkers] Error updating site rep:", updateError);
          } else {
            results.siteRepWorkerId = existingSiteRep.id;
          }
        } else {
          // Create new worker
          const { data: newWorker, error: insertError } = await supabase
            .from("contractor_workers")
            .insert({
              tenant_id: tenantId,
              company_id: companyId,
              full_name: siteRep.full_name,
              national_id: siteRep.national_id,
              mobile_number: siteRep.mobile_number || siteRep.phone || "N/A",
              nationality: siteRep.nationality || null,
              photo_path: siteRep.photo_path,
              worker_type: "site_representative",
              approval_status: "approved",
              approved_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (insertError) {
            console.error("[useSyncPersonnelToWorkers] Error creating site rep worker:", insertError);
          } else {
            results.siteRepWorkerId = newWorker.id;
          }
        }
      }

      // Sync Safety Officers to contractor_workers
      for (const officer of safetyOfficers) {
        if (!officer.full_name || !officer.national_id) continue;

        // Check if worker with this national_id already exists
        const { data: existingOfficer } = await supabase
          .from("contractor_workers")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("national_id", officer.national_id)
          .is("deleted_at", null)
          .maybeSingle();

        if (existingOfficer) {
          // Update existing worker
          const { error: updateError } = await supabase
            .from("contractor_workers")
            .update({
              company_id: companyId,
              full_name: officer.full_name,
              mobile_number: officer.mobile_number || officer.phone,
              nationality: officer.nationality || null,
              photo_path: officer.photo_path,
              worker_type: "safety_officer",
              safety_officer_id: officer.id || null,
              approval_status: "approved",
              approved_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingOfficer.id);

          if (updateError) {
            console.error("[useSyncPersonnelToWorkers] Error updating safety officer:", updateError);
          } else {
            results.officerWorkerIds.push(existingOfficer.id);
          }
        } else {
          // Create new worker
          const { data: newWorker, error: insertError } = await supabase
            .from("contractor_workers")
            .insert({
              tenant_id: tenantId,
              company_id: companyId,
              full_name: officer.full_name,
              national_id: officer.national_id,
              mobile_number: officer.mobile_number || officer.phone || "N/A",
              nationality: officer.nationality || null,
              photo_path: officer.photo_path,
              worker_type: "safety_officer",
              safety_officer_id: officer.id || null,
              approval_status: "approved",
              approved_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (insertError) {
            console.error("[useSyncPersonnelToWorkers] Error creating safety officer worker:", insertError);
          } else {
            results.officerWorkerIds.push(newWorker.id);
          }
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
    },
    onError: (error) => {
      console.error("[useSyncPersonnelToWorkers] Sync failed:", error);
      toast.error("Failed to sync personnel to workers list");
    },
  });
}
