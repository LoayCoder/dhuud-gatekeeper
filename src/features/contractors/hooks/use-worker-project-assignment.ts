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
      return data as WorkerProjectAssignment | null;
    },
    enabled: !!workerId,
  });
}
