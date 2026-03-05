import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ContractorWorker } from "./types";

export function useCreateContractorWorker() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();

    return useMutation({
        mutationFn: async (data: Partial<ContractorWorker>) => {
            if (!profile?.tenant_id) throw new Error("No tenant");

            const { data: result, error } = await supabase
                .from("contractor_workers")
                .insert({
                    company_id: data.company_id!,
                    full_name: data.full_name!,
                    full_name_ar: data.full_name_ar,
                    national_id: data.national_id!,
                    nationality: data.nationality,
                    mobile_number: data.mobile_number!,
                    preferred_language: data.preferred_language || "en",
                    tenant_id: profile.tenant_id,
                    approval_status: "pending",
                })
                .select()
                .single();

            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
            queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
            toast.success("Worker added");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

// Stage 1: Contractor Consultant OR Contractor Admin approves worker -> moves to pending_security
export function useApproveWorker() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (workerId: string) => {
            const { data: hasAccess } = await supabase.rpc("has_contractor_approval_access", {
                p_user_id: user?.id,
            });

            if (!hasAccess) {
                throw new Error("Only Contractor Consultants or Contractor Admins can approve workers at this stage");
            }

            const { data, error } = await supabase
                .from("contractor_workers")
                .update({
                    approval_status: "pending_security",
                    approved_at: new Date().toISOString(),
                    approved_by: user?.id,
                })
                .eq("id", workerId)
                .select("id, full_name, tenant_id, company_id")
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
            queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
            queryClient.invalidateQueries({ queryKey: ["pending-security-approvals"] });
            toast.success("Worker approved - pending security review");

            try {
                await supabase.functions.invoke("contractor-audit-log", {
                    body: {
                        entity_type: "contractor_worker",
                        entity_id: data.id,
                        action: "worker_stage1_approved",
                        old_value: { approval_status: "pending" },
                        new_value: { approval_status: "pending_security", full_name: data.full_name },
                        tenant_id: data.tenant_id,
                    },
                });
            } catch (e) {
                console.error("Failed to log audit event:", e);
            }
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

// Stage 2: Security Supervisor OR Security Manager final approval
export function useSecurityApproveWorker() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (workerId: string) => {
            const { data: hasAccess } = await supabase.rpc("has_security_approval_access", {
                p_user_id: user?.id,
            });

            if (!hasAccess) {
                throw new Error("Only Security Supervisors or Security Managers can approve workers at this stage");
            }

            const { data, error } = await supabase
                .from("contractor_workers")
                .update({
                    approval_status: "approved",
                    security_approval_status: "approved",
                    security_approved_at: new Date().toISOString(),
                    security_approved_by: user?.id,
                })
                .eq("id", workerId)
                .select("id, full_name, tenant_id, company_id, mobile_number, preferred_language")
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
            queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
            queryClient.invalidateQueries({ queryKey: ["pending-security-approvals"] });
            toast.success("Worker approved by security");

            try {
                await supabase.functions.invoke("contractor-audit-log", {
                    body: {
                        entity_type: "contractor_worker",
                        entity_id: data.id,
                        action: "worker_security_approved",
                        old_value: { approval_status: "pending_security" },
                        new_value: { approval_status: "approved", full_name: data.full_name },
                        tenant_id: data.tenant_id,
                    },
                });
            } catch (e) {
                console.error("Failed to log audit event:", e);
            }

            try {
                await supabase.functions.invoke("send-contractor-notification", {
                    body: {
                        workerId: data.id,
                        workerName: data.full_name,
                        action: "worker_approved",
                        tenant_id: data.tenant_id,
                    },
                });
            } catch (e) {
                console.error("Failed to send notification:", e);
            }

            try {
                await supabase.functions.invoke("send-induction-video", {
                    body: {
                        workerId: data.id,
                        workerName: data.full_name,
                        workerMobile: data.mobile_number,
                        workerLanguage: data.preferred_language || "en",
                        tenant_id: data.tenant_id,
                    },
                });
                toast.info("Safety induction sent to worker");
            } catch (e) {
                console.error("Failed to send induction video:", e);
            }
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

// Security Supervisor/Manager rejection
export function useSecurityRejectWorker() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ workerId, reason }: { workerId: string; reason: string }) => {
            const { data: hasAccess } = await supabase.rpc("has_security_approval_access", {
                p_user_id: user?.id,
            });

            if (!hasAccess) {
                throw new Error("Only Security Supervisors or Security Managers can reject workers at this stage");
            }

            const { data: workerInfo } = await supabase
                .from("contractor_workers")
                .select("company_id")
                .eq("id", workerId)
                .single();

            const { data, error } = await supabase
                .from("contractor_workers")
                .update({
                    approval_status: "pending",
                    security_approval_status: "rejected",
                    security_approved_by: user?.id,
                    security_approved_at: new Date().toISOString(),
                    security_rejection_reason: reason,
                    approved_at: null,
                    approved_by: null,
                })
                .eq("id", workerId)
                .select("id, full_name, tenant_id")
                .single();

            if (error) throw error;
            return { ...data, reason, companyId: workerInfo?.company_id };
        },
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
            queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
            queryClient.invalidateQueries({ queryKey: ["pending-security-approvals"] });
            toast.success("Worker returned to pending with security comments");

            try {
                await supabase.functions.invoke("contractor-audit-log", {
                    body: {
                        entity_type: "contractor_worker",
                        entity_id: data.id,
                        action: "worker_security_rejected",
                        old_value: { approval_status: "pending_security" },
                        new_value: {
                            approval_status: "pending",
                            security_rejection_reason: data.reason,
                            full_name: data.full_name
                        },
                        tenant_id: data.tenant_id,
                    },
                });
            } catch (e) {
                console.error("Failed to log audit event:", e);
            }

            try {
                await supabase.functions.invoke("send-contractor-notification", {
                    body: {
                        workerId: data.id,
                        workerName: data.full_name,
                        action: "worker_security_rejected",
                        rejectionReason: data.reason,
                        tenant_id: data.tenant_id,
                        companyId: data.companyId,
                    },
                });
            } catch (e) {
                console.error("Failed to send rejection notification:", e);
            }
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}
