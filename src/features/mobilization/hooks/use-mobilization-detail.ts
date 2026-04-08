import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useMobilizationDetail(projectId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["mobilization-detail", tenantId, projectId],
    queryFn: async () => {
      if (!tenantId || !projectId) return null;
      const { getProjectMobilizationDetail } = await import("../services/mobilizationService");
      return getProjectMobilizationDetail(projectId, tenantId);
    },
    enabled: !!tenantId && !!projectId,
  });
}

export function useMobilizationClearances(mobilizationId: string | undefined) {
  return useQuery({
    queryKey: ["mobilization-clearances", mobilizationId],
    queryFn: async () => {
      if (!mobilizationId) return [];
      const { getMobilizationClearances } = await import("../services/mobilizationService");
      return getMobilizationClearances(mobilizationId);
    },
    enabled: !!mobilizationId,
  });
}

export function useApproveMobilizationCheck() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ checkId, comments }: { checkId: string; comments?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { approveClearanceCheck } = await import("../services/mobilizationService");
      return approveClearanceCheck(checkId, user.id, comments);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mobilization-clearances"] });
      queryClient.invalidateQueries({ queryKey: ["mobilization-detail"] });
      queryClient.invalidateQueries({ queryKey: ["projects-with-mobilization"] });
      toast.success("Clearance approved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRejectMobilizationCheck() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ checkId, comments }: { checkId: string; comments: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { rejectClearanceCheck } = await import("../services/mobilizationService");
      return rejectClearanceCheck(checkId, user.id, comments);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobilization-clearances"] });
      queryClient.invalidateQueries({ queryKey: ["mobilization-detail"] });
      queryClient.invalidateQueries({ queryKey: ["projects-with-mobilization"] });
      toast.success("Clearance rejected");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
