import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

// Fetch active approvers for dropdown
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
