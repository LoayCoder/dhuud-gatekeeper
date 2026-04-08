import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useSiteSignoffs(mobilizationId: string | undefined) {
  return useQuery({
    queryKey: ["site-clearance-signoffs", mobilizationId],
    queryFn: async () => {
      if (!mobilizationId) return [];
      const { getSignoffs } = await import("../services/siteClearanceService");
      return getSignoffs(mobilizationId);
    },
    enabled: !!mobilizationId,
  });
}

export function useEnsureSignoffs(mobilizationId: string | undefined, tenantId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!mobilizationId || !tenantId) throw new Error("Missing IDs");
      const { ensureDisciplineSignoffs } = await import("../services/siteClearanceService");
      return ensureDisciplineSignoffs(mobilizationId, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-clearance-signoffs", mobilizationId] });
    },
  });
}

export function useSignDiscipline() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ signoffId, comments }: { signoffId: string; comments?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { signDiscipline, logClearanceAudit } = await import("../services/siteClearanceService");
      const result = await signDiscipline(signoffId, user.id, comments);
      // Audit log
      if (profile?.tenant_id) {
        await logClearanceAudit(result.mobilization_id, profile.tenant_id, user.id, 'sign_off', result.discipline, { signoffId, comments });
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-clearance-signoffs"] });
      queryClient.invalidateQueries({ queryKey: ["mobilization-detail"] });
      toast.success("Discipline signed off");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRevokeSignoff() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (signoffId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { revokeSignoff, logClearanceAudit } = await import("../services/siteClearanceService");
      const result = await revokeSignoff(signoffId);
      if (profile?.tenant_id) {
        await logClearanceAudit(result.mobilization_id, profile.tenant_id, user.id, 'revoke', result.discipline);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-clearance-signoffs"] });
      queryClient.invalidateQueries({ queryKey: ["mobilization-detail"] });
      toast.success("Sign-off revoked");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSiteRiskVerification() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ mobilizationId, fields }: { mobilizationId: string; fields: Record<string, boolean> }) => {
      const { updateSiteRiskVerification, logClearanceAudit } = await import("../services/siteClearanceService");
      const result = await updateSiteRiskVerification(mobilizationId, fields);
      if (user?.id && profile?.tenant_id) {
        await logClearanceAudit(mobilizationId, profile.tenant_id, user.id, 'update_verification', undefined, fields);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobilization-detail"] });
      toast.success("Site verification updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateRisksAndControls() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ mobilizationId, fields }: { mobilizationId: string; fields: { known_risks?: string; control_measures?: string } }) => {
      const { updateRisksAndControls, logClearanceAudit } = await import("../services/siteClearanceService");
      const result = await updateRisksAndControls(mobilizationId, fields);
      if (user?.id && profile?.tenant_id) {
        await logClearanceAudit(mobilizationId, profile.tenant_id, user.id, 'update_risk', undefined, fields);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobilization-detail"] });
      toast.success("Risks & controls updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useClearanceAttachments(mobilizationId: string | undefined) {
  return useQuery({
    queryKey: ["clearance-attachments", mobilizationId],
    queryFn: async () => {
      if (!mobilizationId) return [];
      const { getClearanceAttachments } = await import("../services/siteClearanceService");
      return getClearanceAttachments(mobilizationId);
    },
    enabled: !!mobilizationId,
  });
}

export function useUploadClearanceAttachment() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ mobilizationId, file, description }: { mobilizationId: string; file: File; description?: string }) => {
      if (!user?.id || !profile?.tenant_id) throw new Error("Not authenticated");
      const { uploadClearanceAttachment, logClearanceAudit } = await import("../services/siteClearanceService");
      const result = await uploadClearanceAttachment(mobilizationId, profile.tenant_id, user.id, file, description);
      await logClearanceAudit(mobilizationId, profile.tenant_id, user.id, 'upload', undefined, { fileName: file.name });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clearance-attachments"] });
      toast.success("Attachment uploaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteClearanceAttachment() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ attachmentId, mobilizationId }: { attachmentId: string; mobilizationId: string }) => {
      if (!user?.id || !profile?.tenant_id) throw new Error("Not authenticated");
      const { deleteClearanceAttachment, logClearanceAudit } = await import("../services/siteClearanceService");
      await deleteClearanceAttachment(attachmentId);
      await logClearanceAudit(mobilizationId, profile.tenant_id, user.id, 'delete', undefined, { attachmentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clearance-attachments"] });
      toast.success("Attachment removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useClearanceAuditLogs(mobilizationId: string | undefined) {
  return useQuery({
    queryKey: ["clearance-audit-logs", mobilizationId],
    queryFn: async () => {
      if (!mobilizationId) return [];
      const { getClearanceAuditLogs } = await import("../services/siteClearanceService");
      return getClearanceAuditLogs(mobilizationId);
    },
    enabled: !!mobilizationId,
  });
}
