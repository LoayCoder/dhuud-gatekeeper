import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchFilter } from "@/hooks/use-branch-filter";
import { toast } from "sonner";
import type { MobilizationFilters } from "../services/mobilizationService";

export function useProjectsWithMobilization(filters: MobilizationFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const { branchIds, isAllBranchesMode, isLoading: branchLoading, queryKey: branchQueryKey } = useBranchFilter();

  return useQuery({
    queryKey: ["projects-with-mobilization", tenantId, filters, ...branchQueryKey],
    queryFn: async () => {
      if (!tenantId) return [];
      const { getProjectsWithMobilization } = await import("../services/mobilizationService");
      return getProjectsWithMobilization(tenantId, filters, branchIds || [], isAllBranchesMode);
    },
    enabled: !!tenantId && !branchLoading,
  });
}

export function useEnsureMobilization() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!profile?.tenant_id || !user?.id) throw new Error("No tenant");
      const { ensureMobilization } = await import("../services/mobilizationService");
      return ensureMobilization(projectId, profile.tenant_id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects-with-mobilization"] });
      queryClient.invalidateQueries({ queryKey: ["mobilization-detail"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMobilization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mobilizationId, updates }: { mobilizationId: string; updates: Record<string, unknown> }) => {
      const { updateMobilization } = await import("../services/mobilizationService");
      return updateMobilization(mobilizationId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects-with-mobilization"] });
      queryClient.invalidateQueries({ queryKey: ["mobilization-detail"] });
      queryClient.invalidateQueries({ queryKey: ["mobilization-check"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
