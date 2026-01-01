import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardWorkerParams {
  workerId: string;
  projectId: string;
  tenantId?: string;
  videoId?: string;
}

interface OnboardWorkerResult {
  success: boolean;
  worker_name: string;
  project_name: string;
  qr_code_id: string;
  qr_token: string;
  qr_valid_from: string;
  qr_valid_until: string;
  induction_sent: boolean;
  induction_id: string | null;
  induction_error: string | null;
  video_title: string | null;
}

export function useOnboardWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workerId, projectId, tenantId, videoId }: OnboardWorkerParams): Promise<OnboardWorkerResult> => {
      // Get tenant_id if not provided
      let finalTenantId = tenantId;
      if (!finalTenantId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .single();
          finalTenantId = profile?.tenant_id;
        }
      }

      const { data, error } = await supabase.functions.invoke("onboard-worker", {
        body: {
          worker_id: workerId,
          project_id: projectId,
          tenant_id: finalTenantId,
          video_id: videoId,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data as OnboardWorkerResult;
    },
    onSuccess: (data, { workerId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["worker-qr-code", workerId] });
      queryClient.invalidateQueries({ queryKey: ["worker-inductions"] });
      queryClient.invalidateQueries({ queryKey: ["worker-induction-status", workerId] });
      
      if (data.induction_sent) {
        toast.success("Worker onboarded successfully - QR code generated and induction sent");
      } else {
        toast.success("QR code generated. Induction video could not be sent.");
      }
    },
    onError: (error: Error) => {
      // Map technical errors to user-friendly messages
      const errorMessage = error.message?.toLowerCase() || '';
      
      if (errorMessage.includes('project must be active')) {
        toast.error("Cannot onboard: The selected project is not active. Please choose an active project.");
      } else if (errorMessage.includes('worker must be approved')) {
        toast.error("Cannot onboard: This worker has not been approved yet.");
      } else if (errorMessage.includes('worker not found')) {
        toast.error("Worker not found. Please refresh and try again.");
      } else if (errorMessage.includes('project not found')) {
        toast.error("Project not found. Please refresh and try again.");
      } else if (errorMessage.includes('worker does not belong')) {
        toast.error("This worker is not assigned to the selected project's company.");
      } else {
        toast.error(error.message || "Failed to onboard worker. Please try again.");
      }
    },
  });
}
