import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface UpdateWorkerData {
  id: string;
  company_id: string;
  full_name: string;
  full_name_ar?: string | null;
  id_type?: string;
  national_id: string;
  date_of_birth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  mobile_number: string;
  email?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  worker_role?: string | null;
  preferred_language?: string;
  fitness_to_work?: string | null;
  fitness_acknowledged?: boolean;
  medical_check_date?: string | null;
  fitness_expiry_date?: string | null;
  training_certifications?: string[];
  photo_path?: string | null;
  medical_certificate_path?: string | null;
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

      // Build update payload with ALL fields
      const updatePayload: Record<string, unknown> = {
        company_id: data.company_id,
        full_name: data.full_name,
        full_name_ar: data.full_name_ar ?? null,
        id_type: data.id_type || "national_id",
        national_id: data.national_id,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        nationality: data.nationality,
        mobile_number: data.mobile_number,
        email: data.email || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        worker_role: data.worker_role || null,
        preferred_language: data.preferred_language || "en",
        fitness_to_work: data.fitness_to_work || null,
        fitness_acknowledged: data.fitness_acknowledged ?? false,
        medical_check_date: data.medical_check_date || null,
        fitness_expiry_date: data.fitness_expiry_date || null,
        training_certifications: data.training_certifications || [],
        photo_path: data.photo_path,
      };

      // Auto-verify photo when admin uploads/changes it
      const photoChanged = data.photo_path !== currentWorker?.photo_path;
      if (photoChanged && data.photo_path) {
        updatePayload.photo_verified_at = new Date().toISOString();
        updatePayload.photo_verified_by = user?.id || null;
      } else if (photoChanged && !data.photo_path) {
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
