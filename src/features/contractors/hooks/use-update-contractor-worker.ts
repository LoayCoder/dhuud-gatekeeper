import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface UpdateWorkerData {
  id: string;
  company_id: string;
  full_name: string;
  national_id: string;
  nationality?: string | null;
  mobile_number: string;
  preferred_language?: string;
  photo_path?: string | null;
}

export function useUpdateContractorWorker() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: UpdateWorkerData) => {
      if (!profile?.tenant_id) throw new Error("No tenant");

      // Check for duplicate national ID (excluding current worker)
      const { data: existingWorker } = await supabase
        .from("contractor_workers")
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .eq("national_id", data.national_id)
        .neq("id", data.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (existingWorker) {
        throw new Error("DUPLICATE_NATIONAL_ID");
      }

      // Get the current worker to detect photo changes
      const { data: currentWorker } = await supabase
        .from("contractor_workers")
        .select("photo_path")
        .eq("id", data.id)
        .single();

      // Build update payload
      const updatePayload: Record<string, unknown> = {
        company_id: data.company_id,
        full_name: data.full_name,
        national_id: data.national_id,
        nationality: data.nationality,
        mobile_number: data.mobile_number,
        preferred_language: data.preferred_language || "en",
        photo_path: data.photo_path,
      };

      // Auto-verify photo when admin uploads/changes it
      const photoChanged = data.photo_path !== currentWorker?.photo_path;
      if (photoChanged && data.photo_path) {
        updatePayload.photo_verified_at = new Date().toISOString();
        updatePayload.photo_verified_by = user?.id || null;
      } else if (photoChanged && !data.photo_path) {
        // Photo removed — clear verification
        updatePayload.photo_verified_at = null;
        updatePayload.photo_verified_by = null;
      }

      const { data: result, error } = await supabase
        .from("contractor_workers")
        .update(updatePayload)
        .eq("id", data.id)
        .eq("tenant_id", profile.tenant_id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      toast.success(t("contractors.workers.updateSuccess", "Worker updated successfully"));
    },
    onError: (error: Error) => {
      if (error.message === "DUPLICATE_NATIONAL_ID") {
        toast.error(t("contractors.workers.duplicateNationalId", "A worker with this National ID already exists"));
      } else {
        toast.error(error.message);
      }
    },
  });
}