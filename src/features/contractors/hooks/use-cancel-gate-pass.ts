import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Hook for cancelling a pending gate pass request.
 * Only the original requester can cancel their own pending request.
 */
export function useCancelGatePass() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async ({
      passId,
      reason,
    }: {
      passId: string;
      reason?: string;
    }) => {
      if (!user?.id || !tenantId) {
        throw new Error("Not authenticated");
      }

      // Fetch the pass to verify ownership and status
      const { data: pass, error: fetchError } = await supabase
        .from("material_gate_passes")
        .select("id, reference_number, status, requested_by")
        .eq("id", passId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (fetchError || !pass) {
        throw new Error("Gate pass not found");
      }

      // Only the requester can cancel
      if (pass.requested_by !== user.id) {
        throw new Error("You can only cancel your own requests");
      }

      // Can only cancel pending requests (current + legacy statuses)
      const cancellableStatuses = [
        "pending_dept_approval",
        "pending_contractor_approval",
        "pending_club_mgmt_ack",
        "pending_security_approval",
        // Legacy statuses
        "pending_pm_approval",
        "pending_pm",
        "pending_safety_approval",
      ];
      if (!cancellableStatuses.includes(pass.status)) {
        throw new Error(
          `Cannot cancel a pass with status "${pass.status}". Only pending requests can be cancelled.`
        );
      }

      // Update status to cancelled
      const { error: updateError } = await supabase
        .from("material_gate_passes")
        .update({
          status: "cancelled",
          rejection_reason: reason || "Cancelled by requester",
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
        })
        .eq("id", passId);

      if (updateError) throw updateError;

      return { reference_number: pass.reference_number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["my-gate-passes"] });
      toast.success(`Gate pass ${data.reference_number} cancelled`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
