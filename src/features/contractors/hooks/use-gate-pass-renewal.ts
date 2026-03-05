import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from '@/features/users';
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { RenewGatePassResult, ResubmitGatePassResult } from '@/features/contractors';

/**
 * Hook for security supervisors to renew expired unused gate passes.
 * Extends the pass by 24 hours from reactivation.
 * Only allowed once per pass.
 *
 * NOTE: Authorization is handled by the backend RPC function, which is the
 * single source of truth. The frontend should use useCanRenewGatePass() for
 * UI decisions (show/hide button) but not duplicate authorization logic here.
 */
export function useRenewGatePass() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (gatePassId: string): Promise<RenewGatePassResult> => {
      if (!user?.id) {
        throw new Error(t("common.notAuthenticated", "Not authenticated"));
      }

      const { renewGatePass } = await import('@/features/contractors');
      try {
        return await renewGatePass(gatePassId, user.id);
      } catch (error: unknown) {
        throw new Error(error.message || t("contractors.gatePasses.renewalFailed", "Failed to renew gate pass"));
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });
      queryClient.invalidateQueries({ queryKey: ["today-approved-passes"] });

      toast.success(
        t("contractors.gatePasses.renewalSuccess", "Gate pass renewed for 24 hours"),
        {
          description: t(
            "contractors.gatePasses.renewalExpiresAt",
            "Expires at: {{time}}",
            { time: result.renewal_expires_at ? new Date(result.renewal_expires_at).toLocaleString() : 'N/A' }
          ),
        }
      );
    },
    onError: (error: Error) => {
      toast.error(
        t("contractors.gatePasses.renewalError", "Failed to renew gate pass"),
        { description: error.message }
      );
    },
  });
}

/**
 * Hook for requesters to resubmit gate passes that have expired after renewal.
 * Allows updating dates without re-entering all data.
 */
export function useResubmitGatePass() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      gatePassId,
      startDate,
      endDate,
      timeWindowStart,
      timeWindowEnd,
    }: {
      gatePassId: string;
      startDate: string;
      endDate: string;
      timeWindowStart?: string;
      timeWindowEnd?: string;
    }): Promise<ResubmitGatePassResult> => {
      if (!user?.id) {
        throw new Error(t("common.notAuthenticated", "Not authenticated"));
      }

      const { resubmitGatePass } = await import('@/features/contractors');
      try {
        return await resubmitGatePass(gatePassId, user.id, startDate, endDate, timeWindowStart, timeWindowEnd);
      } catch (error: unknown) {
        throw new Error(error.message || t("contractors.gatePasses.resubmitFailed", "Failed to resubmit gate pass"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["my-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });
      queryClient.invalidateQueries({ queryKey: ["pending-gate-pass-approvals"] });

      toast.success(
        t("contractors.gatePasses.resubmitSuccess", "Gate pass resubmitted for approval"),
        {
          description: t("contractors.gatePasses.resubmitDescription", "The pass will go through the approval workflow again."),
        }
      );
    },
    onError: (error: Error) => {
      toast.error(
        t("contractors.gatePasses.resubmitError", "Failed to resubmit gate pass"),
        { description: error.message }
      );
    },
  });
}

/**
 * Hook to check if a gate pass can be renewed.
 *
 * PURPOSE: This is a UI helper hook used to determine whether to show/hide
 * the renewal button. It mirrors the backend validation logic for a better UX
 * (avoiding showing buttons that will fail when clicked).
 *
 * NOTE: The actual authorization enforcement happens in the backend RPC
 * (renew_expired_gate_pass). If role permissions change, update BOTH this
 * hook (for UI) and the RPC (for enforcement). The RPC is the source of truth.
 */
export function useCanRenewGatePass(
  status: string,
  entryTime: string | null,
  renewalCount: number
): { canRenew: boolean; reason?: string } {
  const { t } = useTranslation();
  const { hasRole } = useUserRoles();

  // Mirror the roles checked in the backend RPC for UI consistency
  const hasRenewalRole = hasRole('security_supervisor') ||
    hasRole('hsse_manager') ||
    hasRole('hsse_officer') ||
    hasRole('admin');

  if (!hasRenewalRole) {
    return {
      canRenew: false,
      reason: t("contractors.gatePasses.renewalNotAuthorized", "Only security supervisors can renew gate passes")
    };
  }

  if (status !== 'expired') {
    return {
      canRenew: false,
      reason: t("contractors.gatePasses.renewalOnlyExpired", "Only expired passes can be renewed")
    };
  }

  if (entryTime) {
    return {
      canRenew: false,
      reason: t("contractors.gatePasses.renewalNotUsed", "Cannot renew a pass that has been used")
    };
  }

  if (renewalCount >= 1) {
    return {
      canRenew: false,
      reason: t("contractors.gatePasses.renewalMaxReached", "Pass has already been renewed once")
    };
  }

  return { canRenew: true };
}

/**
 * Hook to check if a gate pass can be resubmitted.
 */
export function useCanResubmitGatePass(
  status: string,
  requestedBy: string
): { canResubmit: boolean; reason?: string } {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (status !== 'pending_resubmission') {
    return {
      canResubmit: false,
      reason: t("contractors.gatePasses.resubmitNotPending", "Pass is not pending resubmission")
    };
  }

  if (user?.id !== requestedBy) {
    return {
      canResubmit: false,
      reason: t("contractors.gatePasses.resubmitOnlyRequester", "Only the original requester can resubmit")
    };
  }

  return { canResubmit: true };
}


