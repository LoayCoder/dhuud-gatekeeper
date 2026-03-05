import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ApprovalConfig, ApprovalLevel } from "./types";

export function useApprovalConfigs(workflowType?: string) {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ["approval-configs", profile?.tenant_id, workflowType],
        queryFn: async () => {
            if (!profile?.tenant_id) throw new Error("No tenant");

            let query = (supabase as unknown)
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

export function useApprovalLevels(configId?: string) {
    return useQuery({
        queryKey: ["approval-levels", configId],
        queryFn: async () => {
            if (!configId) return [];

            const { data, error } = await (supabase as unknown)
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

export function usePurchaseRequests(status?: string) {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ["purchase-requests", profile?.tenant_id, status],
        queryFn: async () => {
            if (!profile?.tenant_id) throw new Error("No tenant");

            let query = (supabase as unknown)
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
