import { supabase } from '../supabaseClient';
import type { WorkerAssignment } from '@/features/contractors/hooks/use-worker-assignments';

export const getProjectWorkerAssignments = async (tenantId: string, projectId: string): Promise<WorkerAssignment[]> => {
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
};

export const getWorkerAssignments = async (tenantId: string, workerId: string): Promise<WorkerAssignment[]> => {
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
};

export const assignWorkerToProject = async (tenantId: string, projectId: string, workerId: string, userId: string): Promise<unknown> => {
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
      created_by: userId,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const removeWorkerFromProject = async (assignmentId: string, reason?: string): Promise<{ assignmentId: string }> => {
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
};
