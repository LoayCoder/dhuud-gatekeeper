import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Valid CHECK constraint values
type ValidAuditAction =
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

// Legacy action names still used in callers
type LegacyAuditAction =
  | "worker_created"
  | "worker_edited_by_rep"
  | "worker_approved"
  | "worker_rejected"
  | "worker_status_changed"
  | "worker_blacklisted"
  | "worker_deleted"
  | "worker_edit_approved"
  | "worker_security_approved"
  | "worker_security_rejected"
  | "gate_pass_created"
  | "gate_pass_approved"
  | "gate_pass_rejected"
  | "gate_pass_resubmitted";

export type ContractorAuditAction = ValidAuditAction | LegacyAuditAction;

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
  worker_security_approved: 'security_approved',
  worker_security_rejected: 'security_rejected',
  gate_pass_created: 'created',
  gate_pass_approved: 'approved',
  gate_pass_rejected: 'rejected',
  gate_pass_resubmitted: 'updated',
};

// Map legacy entity types
const ENTITY_TYPE_MAP: Record<string, string> = {
  material_gate_pass: 'gate_pass',
  contractor_worker: 'worker',
  contractor_company: 'company',
};

interface AuditLogParams {
  entityType: "contractor_company" | "contractor_worker" | "gate_pass" | "material_gate_pass";
  entityId: string;
  action: ContractorAuditAction;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

/**
 * Hook for logging contractor module audit events.
 * Maps legacy action/entity names to valid CHECK constraint values.
 */
export function useContractorAuditLog() {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: AuditLogParams) => {
      if (!profile?.tenant_id) {
        console.warn("No tenant ID for audit logging");
        return;
      }

      const mappedAction = ACTION_MAP[params.action] || params.action;
      const mappedEntityType = ENTITY_TYPE_MAP[params.entityType] || params.entityType;

      const { error } = await supabase.functions.invoke("contractor-audit-log", {
        body: {
          entity_type: mappedEntityType,
          entity_id: params.entityId,
          action: mappedAction,
          old_value: params.oldValue,
          new_value: params.newValue,
          tenant_id: profile.tenant_id,
        },
      });

      if (error) {
        console.error("Failed to log audit event:", error);
        // Don't throw - audit logging should not block the main operation
      }
    },
  });
}
