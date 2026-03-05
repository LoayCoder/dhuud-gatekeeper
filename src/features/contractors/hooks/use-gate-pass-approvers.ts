import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface GatePassApprover {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  code: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  user_id: string | null;
  approver_scope: "external" | "internal" | "both";
  user?: {
    id: string;
    full_name: string;
    job_title: string | null;
    avatar_url: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface EmployeeApprover {
  id: string;
  full_name: string;
  job_title: string | null;
}

// Fetch active approvers for dropdown (from gate_pass_approvers table)
// Now with user details and scope filtering
export function useGatePassApprovers(scope?: "external" | "internal") {
  return useQuery({
    queryKey: ["gate-pass-approvers", "active", scope],
    queryFn: async () => {
      const { getGatePassApprovers } = await import('@/features/contractors');
      return getGatePassApprovers(scope);
    },
  });
}

/**
 * Fetches potential gate pass approvers from employees
 * Used for internal requests when no project is selected
 */
export function useEmployeeApprovers() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["employee-approvers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { getEmployeeApprovers } = await import('@/features/contractors');
      return getEmployeeApprovers(tenantId);
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch all approvers for admin settings page (with user details)
export function useAllGatePassApprovers() {
  return useQuery({
    queryKey: ["gate-pass-approvers", "all"],
    queryFn: async () => {
      const { getAllGatePassApprovers } = await import('@/features/contractors');
      return getAllGatePassApprovers();
    },
  });
}

// Create new approver
export function useCreateGatePassApprover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (approver: {
      name: string;
      name_ar?: string;
      code: string;
      description?: string;
      is_active?: boolean;
      sort_order?: number;
      user_id?: string;
      approver_scope?: "external" | "internal" | "both";
    }) => {
      const { createGatePassApprover } = await import('@/features/contractors');
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      return createGatePassApprover(approver, user.user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gate-pass-approvers"] });
      toast.success("Approver added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add approver");
    },
  });
}

// Update approver
export function useUpdateGatePassApprover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<GatePassApprover> & { id: string }) => {
      const { updateGatePassApprover } = await import('@/features/contractors');
      return updateGatePassApprover(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gate-pass-approvers"] });
      toast.success("Approver updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update approver");
    },
  });
}

// Soft delete approver
export function useDeleteGatePassApprover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { deleteGatePassApprover } = await import('@/features/contractors');
      return deleteGatePassApprover(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gate-pass-approvers"] });
      toast.success("Approver deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete approver");
    },
  });
}
