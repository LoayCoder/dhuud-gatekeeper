import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useContractorAuditLog } from "../use-contractor-audit-log";
import { toast } from "sonner";

/**
 * Mutation to verify a worker's photo after upload.
 * Sets photo_verified_by and photo_verified_at on the worker record.
 */
export function useVerifyWorkerPhoto() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const auditLog = useContractorAuditLog();

  return useMutation({
    mutationFn: async ({ workerId, photoPath }: { workerId: string; photoPath: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("contractor_workers")
        .update({
          photo_path: photoPath,
          photo_verified_by: user.id,
          photo_verified_at: new Date().toISOString(),
        })
        .eq("id", workerId)
        .select("id, photo_path, photo_verified_by, photo_verified_at")
        .single()
        .throwOnError();

      if (error) throw error;

      // Audit log
      auditLog.mutate({
        entityType: "contractor_worker",
        entityId: workerId,
        action: "worker_edited_by_rep",
        newValue: { photo_path: photoPath, photo_verified: true },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      toast.success("Photo verified successfully");
    },
    onError: (error) => {
      console.error("Failed to verify worker photo:", error);
      toast.error("Failed to verify photo");
    },
  });
}
