import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to check if the current user has Document Controller access.
 * Document Controllers have full control over /contractors/workers:
 * - Approve/reject workers
 * - Change worker status
 * - Blacklist workers
 * - Delete workers
 */
export function useDocumentControllerAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["document-controller-access", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase.rpc("has_document_controller_access", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error checking document controller access:", error);
        return false;
      }

      return data as boolean;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
