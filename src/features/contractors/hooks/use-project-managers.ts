import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProjectManager {
  id: string;
  full_name: string;
  email: string | null;
}

export function useProjectManagers(branchId?: string) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["project-managers", tenantId, branchId],
    queryFn: async () => {
      if (!tenantId) return [];

      if (branchId) {
        // Two-step query: get user IDs from branch assignments, then fetch profiles
        const { data: assignments, error: assignError } = await supabase
          .from("user_branch_assignments" as any)
          .select("user_id")
          .eq("branch_id", branchId)
          .is("deleted_at", null);

        if (assignError) throw assignError;

        const userIds = [...new Set((assignments as any[] ?? []).map((a: any) => a.user_id).filter(Boolean))];
        if (userIds.length === 0) return [];

        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds)
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("full_name");

        if (profileError) throw profileError;
        return (profiles ?? []) as ProjectManager[];
      }

      // No branch filter — return all active profiles in tenant
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data as ProjectManager[];
    },
    enabled: !!tenantId,
  });
}
