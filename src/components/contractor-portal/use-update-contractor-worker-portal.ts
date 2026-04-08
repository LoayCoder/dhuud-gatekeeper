import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface UpdateWorkerData {
  full_name: string;
  full_name_ar?: string | null;
  id_type?: string;
  national_id: string;
  date_of_birth?: string | null;
  gender?: string | null;
  mobile_number: string;
  email?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  nationality?: string | null;
  worker_role?: string;
  preferred_language: string;
  fitness_to_work?: string | null;
  fitness_acknowledged?: boolean;
  medical_check_date?: string | null;
  fitness_expiry_date?: string | null;
  medical_certificate_path?: string | null;
  training_certifications?: string[];
  photo_path?: string | null;
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
          id_type: data.id_type,
          national_id: data.national_id,
          date_of_birth: data.date_of_birth,
          gender: data.gender,
          mobile_number: data.mobile_number,
          email: data.email,
          emergency_contact_name: data.emergency_contact_name,
          emergency_contact_phone: data.emergency_contact_phone,
          nationality: data.nationality,
          worker_role: data.worker_role,
          preferred_language: data.preferred_language,
          fitness_to_work: data.fitness_to_work,
          fitness_acknowledged: data.fitness_acknowledged,
          medical_check_date: data.medical_check_date,
          fitness_expiry_date: data.fitness_expiry_date,
          medical_certificate_path: data.medical_certificate_path,
          training_certifications: data.training_certifications,
          photo_path: data.photo_path,
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
