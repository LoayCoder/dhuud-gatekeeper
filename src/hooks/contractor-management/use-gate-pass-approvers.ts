import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface GatePassApprover {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  code: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeApprover {
  id: string;
  full_name: string;
  job_title: string | null;
}

// Fetch active approvers for dropdown (from gate_pass_approvers table)
export function useGatePassApprovers() {
  return useQuery({
    queryKey: ["gate-pass-approvers", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gate_pass_approvers")
        .select("id, name, name_ar, code, sort_order")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Pick<GatePassApprover, "id" | "name" | "name_ar" | "code" | "sort_order">[];
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

      // Get employees who can approve gate passes
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, job_title")
        .eq("tenant_id", tenantId)
        .eq("is_deleted", false)
        .eq("is_active", true)
        .eq("user_type", "employee")
        .not("full_name", "is", null)
        .order("full_name", { ascending: true });

      if (error) throw error;
      return (data || []) as EmployeeApprover[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch all approvers for admin settings page
export function useAllGatePassApprovers() {
  return useQuery({
    queryKey: ["gate-pass-approvers", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gate_pass_approvers")
        .select("id, tenant_id, name, name_ar, code, description, is_active, sort_order, created_at, updated_at")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as GatePassApprover[];
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
    }) => {
      // Get tenant_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error("Tenant not found");

      const { data, error } = await supabase
        .from("gate_pass_approvers")
        .insert({
          ...approver,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from("gate_pass_approvers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from("gate_pass_approvers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
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
