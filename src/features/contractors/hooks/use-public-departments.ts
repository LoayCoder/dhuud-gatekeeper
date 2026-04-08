import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicDepartmentWithApprover {
  department_id: string;
  department_name: string;
  department_name_ar: string | null;
  approver_id: string;
  approver_name: string;
  approver_role: string;
}

/**
 * Fetch departments that have an approver (dept rep or manager)
 * for the public gate pass form department selector.
 */
export function usePublicDepartments(tenantId: string | undefined, branchId: string | undefined) {
  return useQuery({
    queryKey: ["public-departments-with-approvers", tenantId, branchId],
    queryFn: async () => {
      if (!tenantId) throw new Error("Tenant ID is required");

      const { data, error } = await supabase.rpc(
        "get_public_departments_with_approvers" as never,
        {
          p_tenant_id: tenantId,
          p_branch_id: branchId || null,
        } as never
      );

      if (error) throw error;
      return (data || []) as unknown as PublicDepartmentWithApprover[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}
