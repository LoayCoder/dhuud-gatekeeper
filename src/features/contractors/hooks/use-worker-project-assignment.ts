import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkerProjectAssignment {
  id: string;
  project_id: string;
  project?: {
    project_name: string;
    status: string;
  } | null;
}

export function useWorkerProjectAssignment(workerId: string | undefined) {
  return useQuery({
    queryKey: ["worker-project-assignment", workerId],
    queryFn: async () => {
      if (!workerId) return null;

      // Source 1: Check project_worker_assignments junction table
      const { data, error } = await supabase
        .from("project_worker_assignments")
        .select(`
          id, project_id,
          project:contractor_projects(project_name, status)
        `)
        .eq("worker_id", workerId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) return data as WorkerProjectAssignment;

      // Source 2: Fallback to contractor_workers.project_id
      const { data: worker, error: workerError } = await supabase
        .from("contractor_workers")
        .select("id, project_id")
        .eq("id", workerId)
        .is("deleted_at", null)
        .maybeSingle();

      if (workerError) throw workerError;
      if (!worker?.project_id) return null;

      const { data: project, error: projectError } = await supabase
        .from("contractor_projects")
        .select("project_name, status")
        .eq("id", worker.project_id)
        .is("deleted_at", null)
        .maybeSingle();

      if (projectError) throw projectError;

      return {
        id: worker.id,
        project_id: worker.project_id,
        project: project ?? null,
      } as WorkerProjectAssignment;
    },
    enabled: !!workerId,
  });
}
