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
      const results: { siteRepWorkerId?: string; siteRepId?: string; officerWorkerIds: string[] } = {
        officerWorkerIds: [],
      };

      // Sync Site Representative to BOTH contractor_site_representatives AND contractor_workers
      if (siteRep && siteRep.full_name && siteRep.national_id) {
        // 1. Sync to contractor_site_representatives table (new primary source)
        const { data: existingSiteRepRecord } = await supabase
          .from("contractor_site_representatives")
          .select("id")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .maybeSingle();

        if (existingSiteRepRecord) {
          // Update existing site rep record
          const { error: updateError } = await supabase
            .from("contractor_site_representatives")
            .update({
              full_name: siteRep.full_name,
              national_id: siteRep.national_id,
              mobile_number: siteRep.mobile_number || siteRep.phone || "N/A",
              phone: siteRep.phone || null,
              email: siteRep.email || null,
              nationality: siteRep.nationality || null,
              photo_path: siteRep.photo_path,
              status: 'active',
            })
            .eq("id", existingSiteRepRecord.id);

          if (updateError) {
            console.error("[useSyncPersonnelToWorkers] Error updating site rep record:", updateError);
          } else {
            results.siteRepId = existingSiteRepRecord.id;
          }
        } else {
          // Create new site rep record
          const { data: newSiteRepRecord, error: insertError } = await supabase
            .from("contractor_site_representatives")
            .insert({
              tenant_id: tenantId,
              company_id: companyId,
              full_name: siteRep.full_name,
              national_id: siteRep.national_id,
              mobile_number: siteRep.mobile_number || siteRep.phone || "N/A",
              phone: siteRep.phone || null,
              email: siteRep.email || null,
              nationality: siteRep.nationality || null,
              photo_path: siteRep.photo_path,
              status: 'active',
            })
            .select("id")
            .single();

          if (insertError) {
            console.error("[useSyncPersonnelToWorkers] Error creating site rep record:", insertError);
          } else {
            results.siteRepId = newSiteRepRecord.id;
          }
        }

        // 2. Also sync to contractor_workers table for gate pass integration
        const { data: existingWorker } = await supabase
          .from("contractor_workers")
          .select("id")
          .eq("company_id", companyId)
          .eq("worker_type", "site_representative")
          .is("deleted_at", null)
          .maybeSingle();

        if (existingWorker) {
          // Update existing worker
          const { error: updateError } = await supabase
            .from("contractor_workers")
            .update({
              full_name: siteRep.full_name,
              national_id: siteRep.national_id,
              mobile_number: siteRep.mobile_number || siteRep.phone,
              nationality: siteRep.nationality || null,
              photo_path: siteRep.photo_path,
              approval_status: "approved",
              approved_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingWorker.id);

          if (updateError) {
            console.error("[useSyncPersonnelToWorkers] Error updating site rep worker:", updateError);
          } else {
            results.siteRepWorkerId = existingWorker.id;
            // Link worker to site rep record
            if (results.siteRepId) {
              await supabase
                .from("contractor_site_representatives")
                .update({ worker_id: existingWorker.id })
                .eq("id", results.siteRepId);
            }
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
            // Link worker to site rep record
            if (results.siteRepId) {
              await supabase
                .from("contractor_site_representatives")
                .update({ worker_id: newWorker.id })
                .eq("id", results.siteRepId);
            }
          }
        }
      }

      // Sync Safety Officers to BOTH contractor_workers AND contractor_safety_officers
      for (const officer of safetyOfficers) {
        if (!officer.full_name || !officer.national_id) continue;

        // 1. Sync to contractor_workers table
        const { data: existingWorker } = await supabase
          .from("contractor_workers")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("national_id", officer.national_id)
          .is("deleted_at", null)
          .maybeSingle();

        let workerId: string;
        if (existingWorker) {
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
            .eq("id", existingWorker.id);

          if (updateError) {
            console.error("[useSyncPersonnelToWorkers] Error updating safety officer worker:", updateError);
          }
          workerId = existingWorker.id;
          results.officerWorkerIds.push(workerId);
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
            workerId = newWorker.id;
            results.officerWorkerIds.push(workerId);
          }
        }

        // 2. Also sync to contractor_safety_officers table for consistency
        const { data: existingOfficerRecord } = await supabase
          .from("contractor_safety_officers")
          .select("id")
          .eq("company_id", companyId)
          .eq("tenant_id", tenantId)
          .or(`name.eq.${officer.full_name},id.eq.${officer.id || 'no-id'}`)
          .is("deleted_at", null)
          .maybeSingle();

        if (existingOfficerRecord) {
          // Update existing safety officer record
          await supabase
            .from("contractor_safety_officers")
            .update({
              name: officer.full_name,
              phone: officer.mobile_number || officer.phone,
              email: officer.email || null,
              is_primary: officer.is_primary || false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingOfficerRecord.id);
        } else {
          // Create new safety officer record
          await supabase
            .from("contractor_safety_officers")
            .insert({
              tenant_id: tenantId,
              company_id: companyId,
              name: officer.full_name,
              phone: officer.mobile_number || officer.phone,
              email: officer.email || null,
              is_primary: officer.is_primary || false,
            });
        }
      }

      return results;
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-site-rep", companyId] });
      queryClient.invalidateQueries({ queryKey: ["contractor-safety-officers", companyId] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
    },
    onError: (error) => {
      console.error("[useSyncPersonnelToWorkers] Sync failed:", error);
      toast.error("Failed to sync personnel to workers list");
    },
  });
}
