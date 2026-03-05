import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchFilter } from "@/hooks/use-branch-filter";
import type { ContractorWorker, ContractorWorkerFilters } from "./types";

export function useContractorWorkers(filters: ContractorWorkerFilters = {}) {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    const { queryKey: branchQueryKey } = useBranchFilter();

    return useQuery({
        queryKey: ["contractor-workers", tenantId, filters, ...branchQueryKey],
        queryFn: async () => {
            if (!tenantId) return [];

            let query = supabase
                .from("contractor_workers")
                .select(`
          id, tenant_id, company_id, full_name, full_name_ar, national_id, nationality,
          mobile_number, photo_path, preferred_language, approval_status, approved_at,
          rejection_reason, created_at, worker_type, safety_officer_id,
          company:contractor_companies(company_name, assigned_branch_id),
          latest_induction:worker_inductions(id, status, expires_at)
        `)
                .eq("tenant_id", tenantId)
                .is("deleted_at", null)
                .order("created_at", { ascending: false });

            if (filters.search) {
                query = query.or(`full_name.ilike.%${filters.search}%,national_id.ilike.%${filters.search}%`);
            }
            if (filters.companyId) query = query.eq("company_id", filters.companyId);
            if (filters.approvalStatus) query = query.eq("approval_status", filters.approvalStatus);

            const { data, error } = await query;
            if (error) throw error;

            // Transform latest_induction array to single object (prioritize acknowledged, then most recent)
            return (data || []).map((worker) => {
                let bestInduction = null;

                if (Array.isArray(worker.latest_induction) && worker.latest_induction.length > 0) {
                    const acknowledgedInduction = worker.latest_induction.find(
                        (i: { status: string }) => i.status === 'acknowledged'
                    );

                    if (acknowledgedInduction) {
                        bestInduction = acknowledgedInduction;
                    } else {
                        bestInduction = worker.latest_induction[0];
                    }
                }

                return {
                    ...worker,
                    latest_induction: bestInduction,
                };
            }) as ContractorWorker[];
        },
        enabled: !!tenantId,
    });
}

export function usePendingWorkerApprovals() {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;

    return useQuery({
        queryKey: ["pending-worker-approvals", tenantId],
        queryFn: async () => {
            if (!tenantId) return [];

            const { data, error } = await supabase
                .from("contractor_workers")
                .select(`id, full_name, national_id, nationality, mobile_number, created_at, company_id, company:contractor_companies(company_name)`)
                .eq("tenant_id", tenantId)
                .eq("approval_status", "pending")
                .is("deleted_at", null)
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as ContractorWorker[];
        },
        enabled: !!tenantId,
    });
}

export function useHasContractorApprovalAccess() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["contractor-approval-access", user?.id],
        queryFn: async () => {
            if (!user?.id) return false;

            const { data, error } = await supabase.rpc("has_contractor_approval_access", {
                p_user_id: user.id,
            });

            if (error) {
                console.error("Failed to check Contractor approval access:", error);
                return false;
            }

            return data === true;
        },
        enabled: !!user?.id,
    });
}

export function useHasSecurityApprovalAccess() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["security-approval-access", user?.id],
        queryFn: async () => {
            if (!user?.id) return false;

            const { data, error } = await supabase.rpc("has_security_approval_access", {
                p_user_id: user.id,
            });

            if (error) {
                console.error("Failed to check Security approval access:", error);
                return false;
            }

            return data === true;
        },
        enabled: !!user?.id,
    });
}

export function usePendingSecurityApprovals() {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;

    return useQuery({
        queryKey: ["pending-security-approvals", tenantId],
        queryFn: async () => {
            if (!tenantId) return [];

            const { data, error } = await supabase
                .from("contractor_workers")
                .select(`
          id, full_name, full_name_ar, national_id, nationality, mobile_number, 
          created_at, approved_at, photo_path, worker_type, company_id,
          company:contractor_companies(company_name)
        `)
                .eq("tenant_id", tenantId)
                .eq("approval_status", "pending_security")
                .is("deleted_at", null)
                .order("approved_at", { ascending: true });

            if (error) throw error;
            return data as ContractorWorker[];
        },
        enabled: !!tenantId,
    });
}

export function useCheckDuplicateNationalId() {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;

    return async (nationalId: string, excludeWorkerId?: string): Promise<boolean> => {
        if (!tenantId || !nationalId) return false;

        let query = supabase
            .from("contractor_workers")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("national_id", nationalId)
            .is("deleted_at", null);

        if (excludeWorkerId) {
            query = query.neq("id", excludeWorkerId);
        }

        const { data } = await query.maybeSingle();
        return !!data;
    };
}

export function useCheckWorkerIsSiteRep() {
    return async (workerId: string): Promise<{
        isSiteRep: boolean;
        companyName?: string;
        companyId?: string;
    }> => {
        const { data } = await supabase
            .from("contractor_site_representatives")
            .select("id, company_id, company:contractor_companies(company_name)")
            .eq("worker_id", workerId)
            .is("deleted_at", null)
            .maybeSingle();

        return {
            isSiteRep: !!data,
            companyName: (data?.company as any)?.company_name,
            companyId: data?.company_id,
        };
    };
}
