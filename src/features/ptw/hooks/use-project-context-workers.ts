import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

/**
 * Fetch workers for a contractor project (single source of truth).
 * No longer queries ptw_projects.
 */
export function useProjectContextWorkers(projectId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["project-context-workers", tenantId, projectId],
    queryFn: async (): Promise<ProjectContextResult> => {
      if (!tenantId || !projectId) return { workers: [], isInternalWork: false };

      // Read from contractor_projects directly
      const { data: project, error: projectError } = await supabase
        .from("contractor_projects")
        .select("id, company_id, project_type")
        .eq("id", projectId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (projectError || !project) return { workers: [], isInternalWork: false };

      const isInternalWork = project.project_type === "internal";

      if (isInternalWork || !project.company_id) {
        return { workers: [], isInternalWork };
      }

      const { data: workers, error: workersError } = await supabase
        .from("contractor_workers")
        .select("id, full_name, full_name_ar, national_id, mobile_number, approval_status")
        .eq("tenant_id", tenantId)
        .eq("company_id", project.company_id)
        .eq("approval_status", "approved")
        .is("deleted_at", null)
        .order("full_name");

      if (workersError) throw workersError;

      // Get assigned workers for this project
      const { data: assignments } = await supabase
        .from("project_worker_assignments")
        .select("worker_id")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .is("deleted_at", null);

      const assignedWorkerIds = new Set((assignments || []).map((a: any) => a.worker_id));

      const mappedWorkers = (workers || []).map((worker: any) => ({
        ...worker,
        is_assigned: assignedWorkerIds.size > 0 ? assignedWorkerIds.has(worker.id) : true,
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
