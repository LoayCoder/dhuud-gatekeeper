import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from '@/features/users';
import { toast } from "sonner";
import type { GuardGateActionResult } from '@/features/contractors';

/**
 * Hook for security guards to record gate entry/exit.
 * ONLY security_guard role can use this.
 * Actions are triggered automatically after scan validation.
 */
export function useGuardGateAction() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { hasRole } = useUserRoles();

  const isGuard = hasRole('security_guard');
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async ({
      passId,
      passReference,
      action,
      validationMethod,
      metadata,
    }: {
      passId: string;
      passReference: string;
      action: 'entry' | 'exit';
      validationMethod: 'qr_scan' | 'manual_entry';
      metadata?: Record<string, unknown>;
    }): Promise<GuardGateActionResult> => {
      if (!user?.id || !tenantId) {
        throw new Error("Not authenticated");
      }

      if (!isGuard) {
        const { logGateAudit } = await import('@/features/contractors/services/gatePassGuardService');
        await logGateAudit(
          {
            action: 'gate_pass_denied',
            passId,
            passReference,
            result: 'denied',
            reason: 'Unauthorized role - not a security guard',
            validationMethod,
            metadata,
          },
          tenantId,
          user.id,
          profile?.full_name || null
        );
        throw new Error("Access denied: Only security guards can record entry/exit");
      }

      const { processGuardGateAction } = await import('@/features/contractors/services/gatePassGuardService');
      return processGuardGateAction(passId, passReference, action, validationMethod, tenantId, user.id, profile?.full_name || null, metadata);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['material-gate-passes'] });
      queryClient.invalidateQueries({ queryKey: ['today-approved-passes'] });
      queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
      queryClient.invalidateQueries({ queryKey: ['gate-pass-details'] });

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }

      if (result.action === 'entry') {
        toast.success('Entry recorded');
      } else {
        toast.success('Exit recorded - Pass completed');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook to verify a gate pass by reference number (manual entry fallback).
 * Returns pass data for automatic action processing.
 */
export function useVerifyPassByReference() {
  const { profile } = useAuth();
  const { hasRole } = useUserRoles();
  const tenantId = profile?.tenant_id;
  const isGuard = hasRole('security_guard');

  return useMutation({
    mutationFn: async (referenceNumber: string) => {
      if (!tenantId) throw new Error("Not authenticated");
      if (!isGuard) throw new Error("Access denied: Only security guards can verify passes");

      const { verifyPassByReference } = await import('@/features/contractors/services/gatePassVerifyService');
      return verifyPassByReference(referenceNumber, tenantId);
    },
  });
}


