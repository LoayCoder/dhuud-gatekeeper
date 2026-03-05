import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchFilter } from "@/hooks/use-branch-filter";
import type { ContractorCompany, ContractorCompanyFilters } from "./types";

export function useContractorCompanies(filters: ContractorCompanyFilters = {}) {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();

    return useQuery({
        queryKey: ["contractor-companies", tenantId, filters, ...branchQueryKey],
        queryFn: async () => {
            if (!tenantId) return [];

            let query = supabase
                .from("contractor_companies")
                .select(`
          id, tenant_id, company_name, company_name_ar, commercial_registration_number,
          vat_number, email, phone, address, city, status, assigned_client_pm_id,
          suspension_reason, suspended_at, suspended_by, created_at, updated_at, deleted_at, assigned_branch_id
        `)
                .eq("tenant_id", tenantId)
                .is("deleted_at", null)
                .order("company_name", { ascending: true });

            if (filters.search) {
                query = query.or(
                    `company_name.ilike.%${filters.search}%,` +
                    `company_name_ar.ilike.%${filters.search}%,` +
                    `commercial_registration_number.ilike.%${filters.search}%,` +
                    `vat_number.ilike.%${filters.search}%,` +
                    `email.ilike.%${filters.search}%,` +
                    `phone.ilike.%${filters.search}%,` +
                    `address.ilike.%${filters.search}%,` +
                    `city.ilike.%${filters.search}%`
                );
            }

            if (filters.status) {
                query = query.eq("status", filters.status);
            }

            if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
                query = branchIds.length === 1
                    ? query.eq("assigned_branch_id", branchIds[0])
                    : query.in("assigned_branch_id", branchIds);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as unknown as ContractorCompany[];
        },
        enabled: !!tenantId,
    });
}

export function useHasHSSEManagerAccess() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["hsse-manager-access", user?.id],
        queryFn: async () => {
            if (!user?.id) return false;

            const { data, error } = await supabase.rpc("has_hsse_manager_access", {
                p_user_id: user.id,
            });

            if (error) {
                console.error("Failed to check HSSE Manager access:", error);
                return false;
            }

            return data === true;
        },
        enabled: !!user?.id,
    });
}

export function usePendingCompanyApprovals() {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;

    return useQuery({
        queryKey: ["pending-company-approvals", tenantId],
        queryFn: async () => {
            if (!tenantId) return [];

            const { data, error } = await supabase
                .from("contractor_companies")
                .select(`
          id, tenant_id, company_name, company_name_ar, commercial_registration_number,
          vat_number, email, phone, address, city, status, assigned_client_pm_id,
          suspension_reason, suspended_at, created_at, updated_at, created_by,
          scope_of_work, contract_start_date, contract_end_date,
          approval_requested_at, approved_by, approved_at, rejection_reason
        `)
                .eq("tenant_id", tenantId)
                .eq("status", "pending_approval")
                .is("deleted_at", null)
                .order("approval_requested_at", { ascending: true });

            if (error) throw error;
            return (data || []) as unknown as ContractorCompany[];
        },
        enabled: !!tenantId,
    });
}
