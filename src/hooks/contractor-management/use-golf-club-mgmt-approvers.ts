import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GolfClubMgmtApprover {
  id: string;
  full_name: string;
  job_title: string | null;
}

/**
 * Fetch approvers for internal gate passes from Golf Club Management department
 * Returns users with department_representative or department_manager role
 * who are assigned to the Golf Club Management department
 */
export function useGolfClubMgmtApprovers() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["golf-club-mgmt-approvers", tenantId],
    queryFn: async (): Promise<GolfClubMgmtApprover[]> => {
      if (!tenantId) return [];

      // 1. Find Golf Club Management department
      const { data: golfClubDepts, error: deptError } = await supabase
        .from("departments")
        .select("id")
        .eq("tenant_id", tenantId)
        .or("name.eq.Golf Club Management,name.ilike.%golf%club%management%")
        .is("deleted_at", null);

      if (deptError) {
        console.error("Error fetching Golf Club Management departments:", deptError);
        return [];
      }

      if (!golfClubDepts?.length) {
        console.warn("No Golf Club Management department found");
        return [];
      }

      const deptIds = golfClubDepts.map(d => d.id);

      // 2. Find users with department_representative or department_manager role
      // NOTE: user_role_assignments does NOT have deleted_at column
      const { data: roleAssignments, error: roleError } = await supabase
        .from("user_role_assignments")
        .select("user_id, roles!inner(code)")
        .eq("tenant_id", tenantId);

      if (roleError) {
        console.error("Error fetching role assignments:", roleError);
        return [];
      }

      if (!roleAssignments) return [];

      const repManagerUserIds = roleAssignments
        .filter((item) => {
          const roleCode = (item.roles as { code: string })?.code;
          return roleCode === "department_representative" || roleCode === "department_manager";
        })
        .map((item) => item.user_id);

      if (repManagerUserIds.length === 0) {
        console.warn("No users found with department_representative or department_manager role");
        return [];
      }

      // 3. Get profiles of these users who are assigned to Golf Club Management
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, job_title, assigned_department_id")
        .in("id", repManagerUserIds)
        .in("assigned_department_id", deptIds)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("full_name");

      if (profileError) {
        console.error("Error fetching profiles:", profileError);
        return [];
      }

      return (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name || "Unknown",
        job_title: p.job_title,
      }));
    },
    enabled: !!tenantId,
  });
}
