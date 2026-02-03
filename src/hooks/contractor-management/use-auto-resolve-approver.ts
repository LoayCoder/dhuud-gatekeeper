import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AutoResolvedApprover {
  id: string;
  full_name: string;
  job_title: string | null;
  role: "department_representative" | "department_manager" | "manager";
}

export interface UseAutoResolveApproverResult {
  approver: AutoResolvedApprover | null;
  isLoading: boolean;
  isAutoResolved: boolean;
  fallbackReason: string | null;
  error: Error | null;
}

/**
 * Hook to auto-resolve the approver for internal gate pass requests
 * 
 * Logic:
 * - Normal Employee → routes to their Department Representative
 * - Dept Rep/Manager → routes to their direct Manager (via manager_team)
 * - Fallback → returns null so UI shows dropdown
 */
export function useAutoResolveApprover(): UseAutoResolveApproverResult {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["auto-resolve-approver", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase.rpc("get_auto_approver_for_gate_pass", {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data as {
        auto_resolved: boolean;
        reason: string;
        approver_id: string | null;
        approver_name: string | null;
        approver_job_title: string | null;
        approver_role: string | null;
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const isAutoResolved = data?.auto_resolved ?? false;

  const approver: AutoResolvedApprover | null = isAutoResolved && data?.approver_id
    ? {
        id: data.approver_id,
        full_name: data.approver_name ?? "Unknown",
        job_title: data.approver_job_title,
        role: data.approver_role as AutoResolvedApprover["role"],
      }
    : null;

  // Map reason codes to user-friendly messages
  const getFallbackReason = (reason: string | null): string | null => {
    if (!reason || isAutoResolved) return null;
    
    switch (reason) {
      case "no_department_assigned":
        return "You are not assigned to a department";
      case "no_manager_assigned":
        return "No manager is assigned to you";
      case "no_dept_rep_found":
        return "No department representative found in your department";
      default:
        return "Could not determine approver automatically";
    }
  };

  return {
    approver,
    isLoading,
    isAutoResolved,
    fallbackReason: getFallbackReason(data?.reason ?? null),
    error: error as Error | null,
  };
}
