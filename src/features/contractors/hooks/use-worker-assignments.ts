import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WorkerAssignment {
  id: string;
  project_id: string;
  worker_id: string;
  assigned_at: string;
  created_by: string | null;
  removed_at: string | null;
  removal_reason: string | null;
  is_active: boolean;
  worker?: {
    id: string;
    full_name: string;
    full_name_ar: string | null;
    national_id: string;
    mobile_number: string;
    approval_status: string;
  };
  project?: {
    id: string;
    project_name: string;
    project_code: string;
  };
}

export function useProjectWorkerAssignments(projectId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["project-worker-assignments", tenantId, projectId],
    queryFn: async () => {
      if (!tenantId || !projectId) return [];
      const { getProjectWorkerAssignments } = await import('@/features/contractors');
      return getProjectWorkerAssignments(tenantId, projectId);
    },
    enabled: !!tenantId && !!projectId,
  });
}

export function useWorkerAssignments(workerId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["worker-assignments", tenantId, workerId],
    queryFn: async () => {
      if (!tenantId || !workerId) return [];
      const { getWorkerAssignments } = await import('@/features/contractors');
      return getWorkerAssignments(tenantId, workerId);
    },
    enabled: !!tenantId && !!workerId,
  });
}

export function useAssignWorkerToProject() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async ({ projectId, workerId }: { projectId: string; workerId: string }) => {
      if (!tenantId || !user?.id) throw new Error("Not authenticated");
      const { assignWorkerToProject } = await import('@/features/contractors');
      return assignWorkerToProject(tenantId, projectId, workerId, user.id);
    },
    onSuccess: (_, { projectId, workerId }) => {
      queryClient.invalidateQueries({ queryKey: ["project-worker-assignments", tenantId, projectId] });
      queryClient.invalidateQueries({ queryKey: ["worker-assignments", tenantId, workerId] });
      toast.success("Worker assigned to project");
    },
    onError: (error) => {
      toast.error(`Failed to assign worker: ${error.message}`);
    },
  });
}

export function useRemoveWorkerFromProject() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async ({ assignmentId, reason }: { assignmentId: string; reason?: string }) => {
      if (!tenantId) throw new Error("Not authenticated");
      const { removeWorkerFromProject } = await import('@/features/contractors');
      return removeWorkerFromProject(assignmentId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-worker-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["worker-assignments"] });
      toast.success("Worker removed from project");
    },
    onError: (error) => {
      toast.error(`Failed to remove worker: ${error.message}`);
    },
  });
}
