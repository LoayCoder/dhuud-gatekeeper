import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PassTypeScope = "external" | "internal" | "both";

export interface GatePassType {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  icon: string | null;
  allowed_scope: PassTypeScope;
  is_active: boolean;
  sort_order: number;
}

interface CreateGatePassTypeInput {
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  icon?: string;
  allowed_scope?: PassTypeScope;
  is_active?: boolean;
  sort_order?: number;
}

interface UpdateGatePassTypeInput {
  id: string;
  code?: string;
  name?: string;
  name_ar?: string;
  description?: string;
  icon?: string;
  allowed_scope?: PassTypeScope;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Fetch active gate pass types, optionally filtered by scope
 */
export function useGatePassTypes(scope?: "external" | "internal") {
  return useQuery({
    queryKey: ["gate-pass-types", scope],
    queryFn: async () => {
      let query = supabase
        .from("gate_pass_types")
        .select("id, code, name, name_ar, description, icon, allowed_scope, is_active, sort_order")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

      // Filter by scope if provided
      if (scope) {
        // Include types that match the scope OR are "both"
        query = query.or(`allowed_scope.eq.${scope},allowed_scope.eq.both`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((item) => ({
        ...item,
        allowed_scope: (item.allowed_scope as PassTypeScope) || "both",
      })) as GatePassType[];
    },
  });
}

/**
 * Fetch all gate pass types for admin settings
 */
export function useAllGatePassTypes() {
  return useQuery({
    queryKey: ["gate-pass-types", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gate_pass_types")
        .select("id, code, name, name_ar, description, icon, allowed_scope, is_active, sort_order")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return (data || []).map((item) => ({
        ...item,
        allowed_scope: (item.allowed_scope as PassTypeScope) || "both",
      })) as GatePassType[];
    },
  });
}

/**
 * Create a new gate pass type
 */
export function useCreateGatePassType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGatePassTypeInput) => {
      // Get the current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) throw new Error("No tenant found");

      const { data, error } = await supabase
        .from("gate_pass_types")
        .insert({
          tenant_id: profile.tenant_id,
          code: input.code,
          name: input.name,
          name_ar: input.name_ar,
          description: input.description,
          icon: input.icon,
          allowed_scope: input.allowed_scope || "both",
          is_active: input.is_active ?? true,
          sort_order: input.sort_order ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gate-pass-types"] });
      toast.success("Pass type created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create pass type");
    },
  });
}

/**
 * Update an existing gate pass type
 */
export function useUpdateGatePassType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateGatePassTypeInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("gate_pass_types")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gate-pass-types"] });
      toast.success("Pass type updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update pass type");
    },
  });
}

/**
 * Soft delete a gate pass type
 */
export function useDeleteGatePassType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gate_pass_types")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gate-pass-types"] });
      toast.success("Pass type deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete pass type");
    },
  });
}
