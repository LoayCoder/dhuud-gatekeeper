import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProjectManager {
  id: string;
  full_name: string;
  email: string | null;
}

export function useProjectManagers() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["project-managers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get users who can be project managers (managers, admins, or users with PM role)
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
