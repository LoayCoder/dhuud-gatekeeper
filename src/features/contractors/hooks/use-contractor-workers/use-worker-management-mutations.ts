import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Stage 1 Rejection by Contractor Consultant/Admin
export function useRejectWorker() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ workerId, reason }: { workerId: string; reason: string }) => {
            const { data: hasAccess } = await supabase.rpc("has_contractor_approval_access", {
                p_user_id: user?.id,
            });

            if (!hasAccess) {
                throw new Error("Only Contractor Consultants or Contractor Admins can reject workers at this stage");
            }

            const { data: workerInfo } = await supabase
                .from("contractor_workers")
                .select("company_id")
                .eq("id", workerId)
                .single();

            const { data, error } = await supabase
                .from("contractor_workers")
                .update({ approval_status: "rejected", rejection_reason: reason })
                .eq("id", workerId)
                .select("id, full_name, tenant_id")
                .single();

            if (error) throw error;
            return { ...data, reason, companyId: workerInfo?.company_id };
        },
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
            queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
            toast.success("Worker rejected");

            try {
                await supabase.functions.invoke("contractor-audit-log", {
                    body: {
                        entity_type: "contractor_worker",
                        entity_id: data.id,
                        action: "worker_rejected",
                        old_value: { approval_status: "pending" },
                        new_value: { approval_status: "rejected", rejection_reason: data.reason, full_name: data.full_name },
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
                        action: "worker_rejected",
                        rejectionReason: data.reason,
                        tenant_id: data.tenant_id,
                        companyId: data.companyId,
                    },
                });
            } catch (e) {
                console.error("Failed to send notification:", e);
            }
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

export function useBulkApproveWorkers() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (workerIds: string[]) => {
            const { data, error } = await supabase
                .from("contractor_workers")
                .update({ approval_status: "approved", approved_at: new Date().toISOString() })
                .in("id", workerIds)
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
            queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
            toast.success(`${data.length} workers approved`);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

export function useBulkRejectWorkers() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ workerIds, reason }: { workerIds: string[]; reason: string }) => {
            const { data, error } = await supabase
                .from("contractor_workers")
                .update({ approval_status: "rejected", rejection_reason: reason })
                .in("id", workerIds)
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
            queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
            toast.success(`${data.length} workers rejected`);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

export function useDeleteContractorWorker() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (workerId: string) => {
            const { error } = await supabase
                .from("contractor_workers")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", workerId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
            queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
            queryClient.invalidateQueries({ queryKey: ["contractor-site-rep"] });
            toast.success("Worker deleted");
        },
        onError: (error: Error) => {
            if (error.message.includes('contractor_site_representatives_worker_id_fkey')) {
                toast.error("Cannot delete: This worker is a Site Representative. Please change the company status to Expired first.");
            } else {
                toast.error(error.message);
            }
        },
    });
}

export function useUpdateWorkerStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ workerId, status, reason }: { workerId: string; status: string; reason?: string }) => {
            const updates: Record<string, unknown> = {
                approval_status: status,
            };

            if (status === "approved") {
                updates.approved_at = new Date().toISOString();
                updates.rejection_reason = null;
            } else if (status === "rejected") {
                updates.rejection_reason = reason || null;
                updates.approved_at = null;
            } else if (status === "pending") {
                updates.approved_at = null;
                updates.rejection_reason = null;
            } else if (status === "revoked") {
                updates.rejection_reason = reason || null;
            }

            const { data, error } = await supabase
                .from("contractor_workers")
                .update(updates)
                .eq("id", workerId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
            queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
            toast.success("Worker status updated");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}
