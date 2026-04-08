import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GatePassFallbackApprover {
  id: string;
  full_name: string;
  job_title: string | null;
}

/**
 * Fetch fallback approvers for internal gate passes when auto-resolve fails.
 * Returns users with department_representative or department_manager role
 * in the same tenant.
 */
export function useGatePassFallbackApprovers() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["gate-pass-fallback-approvers", tenantId],
    queryFn: async (): Promise<GatePassFallbackApprover[]> => {
      if (!tenantId) return [];

      // Find users with department_representative or department_manager role
      const { data: roleAssignments, error: roleError } = await supabase
        .from("user_role_assignments")
        .select("user_id, roles!inner(code)")
        .eq("tenant_id", tenantId);

      if (roleError) {
        console.error("Error fetching role assignments:", roleError);
        return [];
      }

      if (!roleAssignments) return [];

      const approverUserIds = roleAssignments
        .filter((item) => {
          const roleCode = (item.roles as { code: string })?.code;
          return roleCode === "department_representative" || roleCode === "department_manager";
        })
        .map((item) => item.user_id);

      if (approverUserIds.length === 0) return [];

      // Get profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, job_title")
        .in("id", approverUserIds)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("full_name");

      if (profileError) {
        console.error("Error fetching approver profiles:", profileError);
        return [];
      }

      return (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name || "Unknown",
        job_title: p.job_title,
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}
