import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { GatePassVerificationResult } from '@/features/contractors';

export type { GatePassVerificationResult };

export function useVerifyGatePassQR() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (qrToken: string): Promise<GatePassVerificationResult> => {
      if (!tenantId) throw new Error("Not authenticated");
      const { verifyGatePassQR } = await import('@/features/contractors');
      return verifyGatePassQR(qrToken, tenantId);
    },
  });
}

export function useConfirmGatePassEntry() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (gatePassId: string) => {
      if (!user?.id || !tenantId) throw new Error("Not authenticated");
      const { confirmGatePassEntry } = await import('@/features/contractors');
      return confirmGatePassEntry(gatePassId, tenantId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["today-approved-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-entries"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });
      toast.success("Entry confirmed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useConfirmGatePassExit() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (gatePassId: string) => {
      if (!user?.id || !tenantId) throw new Error("Not authenticated");
      const { confirmGatePassExit } = await import('@/features/contractors');
      return confirmGatePassExit(gatePassId, tenantId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["today-approved-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-entries"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });
      toast.success("Exit confirmed - Pass completed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

