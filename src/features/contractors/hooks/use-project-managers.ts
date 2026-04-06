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
        // Filter by branch via user_branch_assignments
        const { data, error } = await supabase
          .from("user_branch_assignments")
          .select("user_id, profiles!inner(id, full_name, email)")
          .eq("branch_id", branchId)
          .is("deleted_at", null);

        if (error) throw error;

        // Deduplicate and filter active profiles within tenant
        const seen = new Set<string>();
        const result: ProjectManager[] = [];
        for (const row of data ?? []) {
          const p = row.profiles as unknown as { id: string; full_name: string; email: string | null };
          if (p && !seen.has(p.id)) {
            seen.add(p.id);
            result.push({ id: p.id, full_name: p.full_name, email: p.email });
          }
        }
        return result.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
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
