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

export function useUpdateApprovalConfig() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<ApprovalConfig> & { id: string }) => {
            const { data, error } = await (supabase as unknown)
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

export function useSaveApprovalLevels() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { profile } = useAuth();

    return useMutation({
        mutationFn: async ({ configId, levels }: { configId: string; levels: Omit<ApprovalLevel, "id" | "config_id" | "tenant_id">[] }) => {
            if (!profile?.tenant_id) throw new Error("No tenant");

            await (supabase as unknown)
                .from("asset_approval_levels")
                .update({ deleted_at: new Date().toISOString() })
                .eq("config_id", configId);

            if (levels.length > 0) {
                const { error } = await (supabase as unknown)
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

export function useCreatePurchaseRequest() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { profile, user } = useAuth();

    return useMutation({
        mutationFn: async (request: Omit<PurchaseRequest, "id" | "tenant_id" | "request_number" | "requested_by" | "requested_at" | "created_at" | "status" | "current_approval_level">) => {
            if (!profile?.tenant_id || !user?.id) throw new Error("Not authenticated");

            const { data, error } = await (supabase as unknown)
                .from("asset_purchase_requests")
                .insert({
                    ...request,
                    tenant_id: profile.tenant_id,
                    requested_by: user.id,
                    request_number: "",
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

export function useDecidePurchaseRequest() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { profile, user } = useAuth();

    return useMutation({
        mutationFn: async ({ requestId, decision, notes }: { requestId: string; decision: "approved" | "rejected" | "returned"; notes?: string }) => {
            if (!profile?.tenant_id || !user?.id) throw new Error("Not authenticated");

            const { data: request, error: fetchError } = await (supabase as unknown)
                .from("asset_purchase_requests")
                .select("current_approval_level")
                .eq("id", requestId)
                .single();

            if (fetchError) throw fetchError;

            const { error: approvalError } = await (supabase as unknown)
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

            const updates: Partial<PurchaseRequest> = {};
            if (decision === "approved") {
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

            const { error: updateError } = await (supabase as unknown)
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

export function useUpdatePurchaseRequest() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<PurchaseRequest> & { id: string }) => {
            const { data, error } = await (supabase as unknown)
                .from("asset_purchase_requests")
                .update(updates)
                .eq("id", id)
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
            const { error } = await (supabase as unknown)
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
