import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DeptApprover {
  id: string;
  full_name: string;
  job_title: string | null;
}

/**
 * Fetch available approvers for internal gate passes
 * This returns department managers, representatives, and gate pass approvers
 */
export function useDeptApprovers() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["dept-approvers", tenantId],
    queryFn: async (): Promise<DeptApprover[]> => {
      if (!tenantId) return [];

      const approversMap = new Map<string, DeptApprover>();

      // Get gate pass approvers
      const { data: gatePassApprovers, error: approversError } = await supabase
        .from("gate_pass_approvers")
        .select("user_id")
        .eq("is_active", true)
        .is("deleted_at", null);

      if (approversError) {
        console.error("Error fetching gate pass approvers:", approversError);
      }

      // Get profile details for approvers
      if (gatePassApprovers && gatePassApprovers.length > 0) {
        const userIds = gatePassApprovers.map(a => a.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, job_title")
          .in("id", userIds);

        profiles?.forEach((p) => {
          if (p.id && !approversMap.has(p.id)) {
            approversMap.set(p.id, {
              id: p.id,
              full_name: p.full_name || "Unknown",
              job_title: p.job_title,
            });
          }
        });
      }

      // Also fetch users with department_representative or department_manager role
      const { data: roleAssignments } = await supabase
        .from("user_role_assignments")
        .select("user_id, roles!inner(code)")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (roleAssignments) {
        const repUserIds = roleAssignments
          .filter((item) => {
            const roleCode = (item.roles as { code: string })?.code;
            return roleCode === "department_representative" || roleCode === "department_manager";
          })
          .map((item) => item.user_id);

        if (repUserIds.length > 0) {
          const { data: repProfiles } = await supabase
            .from("profiles")
            .select("id, full_name, job_title")
            .in("id", repUserIds);

          repProfiles?.forEach((p) => {
            if (p.id && !approversMap.has(p.id)) {
              approversMap.set(p.id, {
                id: p.id,
                full_name: p.full_name || "Unknown",
                job_title: p.job_title,
              });
            }
          });
        }
      }

      return Array.from(approversMap.values());
    },
    enabled: !!tenantId,
  });
}
