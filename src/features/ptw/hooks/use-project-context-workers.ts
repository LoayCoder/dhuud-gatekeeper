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

export interface ProjectContextResult {
  workers: ProjectContextWorker[];
  isInternalWork: boolean;
}

export function useProjectContextWorkers(projectId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["project-context-workers", tenantId, projectId],
    queryFn: async (): Promise<ProjectContextResult> => {
      if (!tenantId || !projectId) return { workers: [], isInternalWork: false };

      const { getProjectContextWorkers } = await import("@/features/ptw/services/ptwProjectService");
      const { project, workers, assignments } = await getProjectContextWorkers(projectId, tenantId);

      if (!project) return { workers: [], isInternalWork: false };

      const isInternalWork = !!(project as any).is_internal_work;

      // Internal projects return no workers — that's expected
      if (isInternalWork || !workers || workers.length === 0) {
        return { workers: [], isInternalWork };
      }

      let assignedWorkerIds = new Set<string>();

      if (assignments) {
        assignedWorkerIds = new Set(assignments.map(a => a.worker_id));
      }

      const mappedWorkers = (workers || []).map(worker => ({
        ...worker,
        is_assigned: (project as any).linked_contractor_project_id
          ? assignedWorkerIds.has(worker.id)
          : true,
      }));

      return { workers: mappedWorkers, isInternalWork };
    },
    enabled: !!tenantId && !!projectId,
  });
}

export function useAssignedProjectWorkers(projectId: string | undefined) {
  const { data, ...rest } = useProjectContextWorkers(projectId);

  return {
    ...rest,
    data: data?.workers?.filter(w => w.is_assigned) || [],
  };
}
