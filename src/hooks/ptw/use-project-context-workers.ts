import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

/**
 * Fetches workers that belong to the contractor assigned to a specific project.
 * Filters to only show approved workers who are actively assigned to the project.
 */
export function useProjectContextWorkers(projectId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["project-context-workers", tenantId, projectId],
    queryFn: async (): Promise<ProjectContextWorker[]> => {
      if (!tenantId || !projectId) return [];

      // 1. Get the project's contractor_company_id and linked_contractor_project_id
      const { data: project, error: projectError } = await supabase
        .from("ptw_projects")
        .select("contractor_company_id, linked_contractor_project_id")
        .eq("id", projectId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (projectError || !project?.contractor_company_id) {
        console.warn("Project not found or no contractor assigned:", projectError);
        return [];
      }

      // 2. Get active, approved workers from that contractor
      const { data: workers, error: workersError } = await supabase
        .from("contractor_workers")
        .select(`
          id, full_name, full_name_ar, national_id, mobile_number, approval_status
        `)
        .eq("tenant_id", tenantId)
        .eq("company_id", project.contractor_company_id)
        .eq("approval_status", "approved")
        .is("deleted_at", null)
        .order("full_name");

      if (workersError) {
        console.error("Error fetching contractor workers:", workersError);
        throw workersError;
      }

      // 3. If project has a linked contractor project, get active assignments
      let assignedWorkerIds = new Set<string>();
      
      if (project.linked_contractor_project_id) {
        const { data: assignments, error: assignmentsError } = await supabase
          .from("project_worker_assignments")
          .select("worker_id")
          .eq("project_id", project.linked_contractor_project_id)
          .eq("is_active", true)
          .is("deleted_at", null);

        if (!assignmentsError && assignments) {
          assignedWorkerIds = new Set(assignments.map(a => a.worker_id));
        }
      }

      // 4. Map workers with assignment status
      return (workers || []).map(worker => ({
        ...worker,
        is_assigned: project.linked_contractor_project_id 
          ? assignedWorkerIds.has(worker.id)
          : true, // If no linked project, consider all contractor workers as available
      }));
    },
    enabled: !!tenantId && !!projectId,
  });
}

/**
 * Fetches only assigned workers (stricter filter for permit creation)
 */
export function useAssignedProjectWorkers(projectId: string | undefined) {
  const { data: workers, ...rest } = useProjectContextWorkers(projectId);
  
  return {
    ...rest,
    data: workers?.filter(w => w.is_assigned) || [],
  };
}
