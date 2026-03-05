import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface ProjectContextWorker {
  id: string;
  full_name: string;
  full_name_ar: string | null;
  national_id: string | null;
  mobile_number: string | null;
  approval_status: string;
  is_assigned: boolean;
}

export function useProjectContextWorkers(projectId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["project-context-workers", tenantId, projectId],
    queryFn: async (): Promise<ProjectContextWorker[]> => {
      if (!tenantId || !projectId) return [];

      const { getProjectContextWorkers } = await import("@/features/ptw/services/ptwProjectService");
      const { project, workers, assignments } = await getProjectContextWorkers(projectId, tenantId);

      if (!project) return [];

      let assignedWorkerIds = new Set<string>();

      if (assignments) {
        assignedWorkerIds = new Set(assignments.map(a => a.worker_id));
      }

      return (workers || []).map(worker => ({
        ...worker,
        is_assigned: project.linked_contractor_project_id
          ? assignedWorkerIds.has(worker.id)
          : true,
      }));
    },
    enabled: !!tenantId && !!projectId,
  });
}

export function useAssignedProjectWorkers(projectId: string | undefined) {
  const { data: workers, ...rest } = useProjectContextWorkers(projectId);

  return {
    ...rest,
    data: workers?.filter(w => w.is_assigned) || [],
  };
}
