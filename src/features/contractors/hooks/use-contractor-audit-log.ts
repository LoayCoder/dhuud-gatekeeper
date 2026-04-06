import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ContractorAuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "approved"
  | "rejected"
  | "suspended"
  | "activated"
  | "revoked"
  | "assigned"
  | "removed"
  | "sent"
  | "viewed"
  | "acknowledged"
  | "verified"
  | "expired";

// Map legacy action names to valid CHECK constraint values
const ACTION_MAP: Record<string, string> = {
  worker_created: 'created',
  worker_edited_by_rep: 'updated',
  worker_approved: 'approved',
  worker_rejected: 'rejected',
  worker_status_changed: 'updated',
  worker_blacklisted: 'suspended',
  worker_deleted: 'deleted',
  worker_edit_approved: 'approved',
  gate_pass_created: 'created',
  gate_pass_approved: 'approved',
  gate_pass_rejected: 'rejected',
  gate_pass_resubmitted: 'updated',
};

interface AuditLogParams {
  entityType: "contractor_company" | "contractor_worker" | "gate_pass";
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
