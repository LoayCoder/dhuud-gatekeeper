import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GatePassCreatePermission {
  canCreate: boolean;
  canCreateInternal: boolean;
  canCreateExternal: boolean;
  contractorCompanyId: string | null;
  isLoading: boolean;
}

/**
 * Hook to check if the current user has permission to create gate passes.
 * 
 * Rules:
 * - Admin: Can create any pass type
 * - Contractor Admin: Can create any pass type  
 * - Internal Employee: Can only create internal passes
 * - Contractor Representative: Can only create external passes for their company
 * - Other roles (security guards, etc): Cannot create passes
 */
export function useCanCreateGatePass(): GatePassCreatePermission {
  const { user, profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["can-create-gate-pass", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { 
          canCreate: false, 
          canCreateInternal: false, 
          canCreateExternal: false, 
          contractorCompanyId: null 
        };
      }

      // Use the RPC function to check permissions
      const { data: permission, error } = await supabase.rpc("can_create_gate_pass", {
        p_user_id: user.id,
        p_is_internal_request: false, // Check general permission
        p_company_id: null,
      });

      if (error) {
        console.error("Permission check error:", error);
        return { 
          canCreate: false, 
          canCreateInternal: false, 
          canCreateExternal: false, 
          contractorCompanyId: null 
        };
      }

      const result = permission as {
        allowed: boolean;
        can_internal?: boolean;
        can_external?: boolean;
        company_id?: string;
        reason?: string;
      };

      return {
        canCreate: result.can_internal || result.can_external || false,
        canCreateInternal: result.can_internal || false,
        canCreateExternal: result.can_external || false,
        contractorCompanyId: result.company_id || null,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    canCreate: data?.canCreate ?? false,
    canCreateInternal: data?.canCreateInternal ?? false,
    canCreateExternal: data?.canCreateExternal ?? false,
    contractorCompanyId: data?.contractorCompanyId ?? null,
    isLoading,
  };
}
