import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ContractorAuditAction =
  | "worker_created"
  | "worker_edited_by_rep"
  | "worker_approved"
  | "worker_rejected"
  | "worker_status_changed"
  | "worker_blacklisted"
  | "worker_deleted"
  | "worker_edit_approved";

interface AuditLogParams {
  entityType: "contractor_worker" | "contractor_company";
  entityId: string;
  action: ContractorAuditAction;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

/**
 * Hook for logging contractor module audit events.
 * Logs actions like worker creation, approval, rejection, status changes, etc.
 */
export function useContractorAuditLog() {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: AuditLogParams) => {
      if (!profile?.tenant_id) {
        console.warn("No tenant ID for audit logging");
        return;
      }

      const { error } = await supabase.functions.invoke("contractor-audit-log", {
        body: {
          entity_type: params.entityType,
          entity_id: params.entityId,
          action: params.action,
          old_value: params.oldValue,
          new_value: params.newValue,
        },
      });

      if (error) {
        console.error("Failed to log audit event:", error);
        // Don't throw - audit logging should not block the main operation
      }
    },
  });
}
