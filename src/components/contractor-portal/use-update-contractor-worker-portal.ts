import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface UpdateWorkerData {
  full_name: string;
  full_name_ar?: string | null;
  national_id: string;
  mobile_number: string;
  nationality?: string | null;
  preferred_language: string;
}

/**
 * Hook for contractor portal users to update worker information.
 * This will trigger re-approval for approved workers via database trigger.
 */
export function useUpdateContractorWorker() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      workerId,
      data,
    }: {
      workerId: string;
      data: UpdateWorkerData;
    }) => {
      if (!profile?.tenant_id) throw new Error("No tenant");

      // Check for duplicate national ID (excluding this worker)
      const { data: existing } = await supabase
        .from("contractor_workers")
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .eq("national_id", data.national_id)
        .neq("id", workerId)
        .is("deleted_at", null)
        .maybeSingle();

      if (existing) {
        throw new Error("DUPLICATE_NATIONAL_ID");
      }

      // Update worker - the database trigger will handle:
      // - Setting edit_pending_approval = true for approved workers
      // - Setting edited_by and edited_at
      const { data: result, error } = await supabase
        .from("contractor_workers")
        .update({
          full_name: data.full_name,
          full_name_ar: data.full_name_ar,
          national_id: data.national_id,
          mobile_number: data.mobile_number,
          nationality: data.nationality,
          preferred_language: data.preferred_language,
          // Note: edited_by and edited_at are set by DB trigger
        })
        .eq("id", workerId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-portal-workers"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      
      // Show appropriate message based on whether re-approval is needed
      if (data.edit_pending_approval) {
        toast.success(
          t(
            "contractorPortal.workers.editedPendingReview",
            "Worker updated. Changes pending review."
          )
        );
      } else {
        toast.success(t("common.saved", "Saved"));
      }
    },
    onError: (error: Error) => {
      if (error.message === "DUPLICATE_NATIONAL_ID") {
        toast.error(
          t(
            "contractors.workers.duplicateNationalId",
            "A worker with this National ID already exists"
          )
        );
      } else {
        toast.error(error.message);
      }
    },
  });
}
