import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface ApprovalConfig {
  id: string;
  tenant_id: string;
  workflow_type: "transfer" | "disposal" | "purchase";
  name: string;
  description?: string;
  auto_approve_below_amount?: number;
  currency: string;
  is_active: boolean;
  escalation_enabled: boolean;
  escalation_hours: number;
  created_at: string;
  updated_at: string;
}

export interface ApprovalLevel {
  id: string;
  config_id: string;
  tenant_id: string;
  level_order: number;
  name: string;
  required_role?: string;
  specific_user_id?: string;
  timeout_hours: number;
  min_amount?: number;
  max_amount?: number;
}

export interface PurchaseRequest {
  id: string;
  tenant_id: string;
  request_number: string;
  title: string;
  description?: string;
  asset_category_id?: string;
  asset_type_id?: string;
  quantity: number;
  estimated_cost: number;
  currency: string;
  budget_code?: string;
  justification?: string;
  vendor_name?: string;
  vendor_quote_path?: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "ordered" | "received";
  current_approval_level: number;
  approval_config_id?: string;
  requested_by: string;
  requested_at: string;
  final_decision_at?: string;
  final_decision_by?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface PurchaseApproval {
  id: string;
  request_id: string;
  tenant_id: string;
  approval_level: number;
  approver_id: string;
  decision: "approved" | "rejected" | "returned";
  notes?: string;
  decided_at: string;
}

// Hook to fetch approval configs
export function useApprovalConfigs(workflowType?: string) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["approval-configs", profile?.tenant_id, workflowType],
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      let query = (supabase as any)
        .from("asset_approval_configs")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .order("workflow_type", { ascending: true });
      
      if (workflowType) {
        query = query.eq("workflow_type", workflowType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ApprovalConfig[];
    },
    enabled: !!profile?.tenant_id,
  });
}

// Hook to fetch approval levels for a config
export function useApprovalLevels(configId?: string) {
  return useQuery({
    queryKey: ["approval-levels", configId],
    queryFn: async () => {
      if (!configId) return [];
      
      const { data, error } = await (supabase as any)
        .from("asset_approval_levels")
        .select("*")
        .eq("config_id", configId)
        .is("deleted_at", null)
        .order("level_order", { ascending: true });
      
      if (error) throw error;
      return data as ApprovalLevel[];
    },
    enabled: !!configId,
  });
}

// Hook to create approval config
export function useCreateApprovalConfig() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  
  return useMutation({
    mutationFn: async (config: Omit<ApprovalConfig, "id" | "tenant_id" | "created_at" | "updated_at">) => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      const { data, error } = await (supabase as any)
        .from("asset_approval_configs")
        .insert({
          ...config,
          tenant_id: profile.tenant_id,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-configs"] });
      toast({
        title: t("common.success"),
        description: t("assets.approvalWorkflow.configCreated", "Approval workflow created"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to update approval config
export function useUpdateApprovalConfig() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApprovalConfig> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("asset_approval_configs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-configs"] });
      toast({
        title: t("common.success"),
        description: t("assets.approvalWorkflow.configUpdated", "Approval workflow updated"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to create/update approval levels
export function useSaveApprovalLevels() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ configId, levels }: { configId: string; levels: Omit<ApprovalLevel, "id" | "config_id" | "tenant_id">[] }) => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      // Delete existing levels
      await (supabase as any)
        .from("asset_approval_levels")
        .update({ deleted_at: new Date().toISOString() })
        .eq("config_id", configId);
      
      // Insert new levels
      if (levels.length > 0) {
        const { error } = await (supabase as any)
          .from("asset_approval_levels")
          .insert(
            levels.map((level, index) => ({
              ...level,
              config_id: configId,
              tenant_id: profile.tenant_id,
              level_order: index + 1,
            }))
          );
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["approval-levels", variables.configId] });
      toast({
        title: t("common.success"),
        description: t("assets.approvalWorkflow.levelsUpdated", "Approval levels updated"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to fetch purchase requests
export function usePurchaseRequests(status?: string) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["purchase-requests", profile?.tenant_id, status],
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      let query = (supabase as any)
        .from("asset_purchase_requests")
        .select(`
          *,
          requester:profiles!asset_purchase_requests_requested_by_fkey(full_name),
          category:asset_categories(name, name_ar),
          type:asset_types(name, name_ar)
        `)
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      
      if (status) {
        query = query.eq("status", status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });
}

// Hook to create purchase request
export function useCreatePurchaseRequest() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  
  return useMutation({
    mutationFn: async (request: Omit<PurchaseRequest, "id" | "tenant_id" | "request_number" | "requested_by" | "requested_at" | "created_at" | "status" | "current_approval_level">) => {
      if (!profile?.tenant_id || !user?.id) throw new Error("Not authenticated");
      
      const { data, error } = await (supabase as any)
        .from("asset_purchase_requests")
        .insert({
          ...request,
          tenant_id: profile.tenant_id,
          requested_by: user.id,
          request_number: "", // Will be generated by trigger
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-purchase-requests"] });
      toast({
        title: t("common.success"),
        description: t("assets.purchaseRequest.created", "Purchase request submitted"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to approve/reject purchase request
export function useDecidePurchaseRequest() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ requestId, decision, notes }: { requestId: string; decision: "approved" | "rejected" | "returned"; notes?: string }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error("Not authenticated");
      
      // Get current request
      const { data: request, error: fetchError } = await (supabase as any)
        .from("asset_purchase_requests")
        .select("current_approval_level")
        .eq("id", requestId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Insert approval record
      const { error: approvalError } = await (supabase as any)
        .from("asset_purchase_approvals")
        .insert({
          request_id: requestId,
          tenant_id: profile.tenant_id,
          approval_level: request.current_approval_level,
          approver_id: user.id,
          decision,
          notes,
        });
      
      if (approvalError) throw approvalError;
      
      // Update request status
      const updates: Partial<PurchaseRequest> = {};
      if (decision === "approved") {
        // TODO: Check if more levels exist
        updates.status = "approved";
        updates.final_decision_at = new Date().toISOString();
        updates.final_decision_by = user.id;
      } else if (decision === "rejected") {
        updates.status = "rejected";
        updates.rejection_reason = notes;
        updates.final_decision_at = new Date().toISOString();
        updates.final_decision_by = user.id;
      } else if (decision === "returned") {
        updates.current_approval_level = Math.max(1, request.current_approval_level - 1);
      }
      
      const { error: updateError } = await (supabase as any)
        .from("asset_purchase_requests")
        .update(updates)
        .eq("id", requestId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-purchase-requests"] });
      toast({
        title: t("common.success"),
        description: t("assets.purchaseRequest.decisionRecorded", "Decision recorded"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
