import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { ApprovalConfig, ApprovalLevel, PurchaseRequest } from "./types";

export function useCreateApprovalConfig() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { profile, user } = useAuth();

    return useMutation({
        mutationFn: async (config: Omit<ApprovalConfig, "id" | "tenant_id" | "created_at" | "updated_at">) => {
            if (!profile?.tenant_id) throw new Error("No tenant");

            const { data, error } = await supabase
                .from("asset_approval_configs")
                .insert({
                    workflow_type: config.workflow_type,
                    name: config.name,
                    description: config.description,
                    auto_approve_below_amount: config.auto_approve_below_amount,
                    currency: config.currency,
                    is_active: config.is_active,
                    escalation_enabled: config.escalation_enabled,
                    escalation_hours: config.escalation_hours,
                    tenant_id: profile.tenant_id,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (error) throw error;
            return data as ApprovalConfig;
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

export function useUpdateApprovalConfig() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<ApprovalConfig> & { id: string }) => {
            const { data, error } = await supabase
                .from("asset_approval_configs")
                .update({
                    name: updates.name,
                    description: updates.description,
                    workflow_type: updates.workflow_type,
                    auto_approve_below_amount: updates.auto_approve_below_amount,
                    currency: updates.currency,
                    is_active: updates.is_active,
                    escalation_enabled: updates.escalation_enabled,
                    escalation_hours: updates.escalation_hours,
                })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as ApprovalConfig;
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

export function useSaveApprovalLevels() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { profile } = useAuth();

    return useMutation({
        mutationFn: async ({ configId, levels }: { configId: string; levels: Omit<ApprovalLevel, "id" | "config_id" | "tenant_id">[] }) => {
            if (!profile?.tenant_id) throw new Error("No tenant");

            await supabase
                .from("asset_approval_levels")
                .update({ deleted_at: new Date().toISOString() })
                .eq("config_id", configId);

            if (levels.length > 0) {
                const { error } = await supabase
                    .from("asset_approval_levels")
                    .insert(
                        levels.map((level, index) => ({
                            name: level.name,
                            required_role: level.required_role,
                            specific_user_id: level.specific_user_id,
                            timeout_hours: level.timeout_hours,
                            min_amount: level.min_amount,
                            max_amount: level.max_amount,
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

export function useCreatePurchaseRequest() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { profile, user } = useAuth();

    return useMutation({
        mutationFn: async (request: Omit<PurchaseRequest, "id" | "tenant_id" | "request_number" | "requested_by" | "requested_at" | "created_at" | "status" | "current_approval_level">) => {
            if (!profile?.tenant_id || !user?.id) throw new Error("Not authenticated");

            const { data, error } = await supabase
                .from("asset_purchase_requests")
                .insert({
                    title: request.title,
                    description: request.description,
                    asset_category_id: request.asset_category_id,
                    asset_type_id: request.asset_type_id,
                    quantity: request.quantity,
                    estimated_cost: request.estimated_cost,
                    currency: request.currency,
                    budget_code: request.budget_code,
                    justification: request.justification,
                    vendor_name: request.vendor_name,
                    vendor_quote_path: request.vendor_quote_path,
                    approval_config_id: request.approval_config_id,
                    tenant_id: profile.tenant_id,
                    requested_by: user.id,
                    request_number: "",
                })
                .select()
                .single();

            if (error) throw error;
            return data as PurchaseRequest;
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

export function useDecidePurchaseRequest() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { profile, user } = useAuth();

    return useMutation({
        mutationFn: async ({ requestId, decision, notes }: { requestId: string; decision: "approved" | "rejected" | "returned"; notes?: string }) => {
            if (!profile?.tenant_id || !user?.id) throw new Error("Not authenticated");

            const { data: request, error: fetchError } = await supabase
                .from("asset_purchase_requests")
                .select("current_approval_level")
                .eq("id", requestId)
                .single();

            if (fetchError) throw fetchError;

            const { error: approvalError } = await supabase
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

            const updatePayload: Record<string, unknown> = {};
            if (decision === "approved") {
                updatePayload.status = "approved";
                updatePayload.final_decision_at = new Date().toISOString();
                updatePayload.final_decision_by = user.id;
            } else if (decision === "rejected") {
                updatePayload.status = "rejected";
                updatePayload.rejection_reason = notes;
                updatePayload.final_decision_at = new Date().toISOString();
                updatePayload.final_decision_by = user.id;
            } else if (decision === "returned") {
                updatePayload.current_approval_level = Math.max(1, request.current_approval_level - 1);
            }

            const { error: updateError } = await supabase
                .from("asset_purchase_requests")
                .update(updatePayload)
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

export function useUpdatePurchaseRequest() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<PurchaseRequest> & { id: string }) => {
            const { data, error } = await supabase
                .from("asset_purchase_requests")
                .update({
                    title: updates.title,
                    description: updates.description,
                    asset_category_id: updates.asset_category_id,
                    asset_type_id: updates.asset_type_id,
                    quantity: updates.quantity,
                    estimated_cost: updates.estimated_cost,
                    currency: updates.currency,
                    budget_code: updates.budget_code,
                    justification: updates.justification,
                    vendor_name: updates.vendor_name,
                    vendor_quote_path: updates.vendor_quote_path,
                })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as PurchaseRequest;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
            queryClient.invalidateQueries({ queryKey: ["pending-purchase-requests"] });
            toast({
                title: t("common.success"),
                description: t("purchaseRequest.updated", "Purchase request updated"),
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

export function useDeletePurchaseRequest() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("asset_purchase_requests")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
            queryClient.invalidateQueries({ queryKey: ["pending-purchase-requests"] });
            toast({
                title: t("common.success"),
                description: t("purchaseRequest.deleted", "Purchase request deleted"),
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
