import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

      const { data, error } = await supabase
        .from("project_worker_assignments")
        .select(`
          id, project_id, worker_id, assigned_at, created_by,
          removed_at, removal_reason, is_active,
          worker:contractor_workers(id, full_name, full_name_ar, national_id, mobile_number, approval_status)
        `)
        .eq("tenant_id", tenantId)
        .eq("project_id", projectId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return (data || []) as WorkerAssignment[];
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

      const { data, error } = await supabase
        .from("project_worker_assignments")
        .select(`
          id, project_id, worker_id, assigned_at, created_by,
          removed_at, removal_reason, is_active,
          project:contractor_projects(id, project_name, project_code)
        `)
        .eq("tenant_id", tenantId)
        .eq("worker_id", workerId)
        .is("deleted_at", null)
        .order("is_active", { ascending: false })
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return (data || []) as WorkerAssignment[];
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

      // Check if already assigned
      const { data: existing } = await supabase
        .from("project_worker_assignments")
        .select("id")
        .eq("project_id", projectId)
        .eq("worker_id", workerId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (existing) throw new Error("Worker already assigned to this project");

      const { data, error } = await supabase
        .from("project_worker_assignments")
        .insert({
          tenant_id: tenantId,
          project_id: projectId,
          worker_id: workerId,
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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

      const { error } = await supabase
        .from("project_worker_assignments")
        .update({
          is_active: false,
          removed_at: new Date().toISOString(),
          removal_reason: reason || null,
        })
        .eq("id", assignmentId);

      if (error) throw error;
      return { assignmentId };
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
