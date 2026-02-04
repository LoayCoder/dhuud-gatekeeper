import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Import types from centralized types file
import type {
  PublicGatePassSubmission,
  PublicGatePassSubmissionResult,
  PublicGatePassStatusResponse,
} from "@/types/public-gate-pass.types";

// Re-export types for convenience
export type {
  PublicGatePassSubmission,
  PublicGatePassSubmissionResult,
  PublicGatePassStatusResponse,
  PublicGatePassStatusData,
  PublicGatePassStatus,
  GatePassType,
} from "@/types/public-gate-pass.types";

/**
 * Submit a public gate pass request
 * NOTE: This requires the database migration to be applied first.
 * The RPC function 'submit_public_gate_pass' must exist in the database.
 */
export function useSubmitPublicGatePass() {
  return useMutation({
    mutationFn: async (_data: PublicGatePassSubmission): Promise<PublicGatePassSubmissionResult> => {
      // TODO: Enable after database migration is applied
      // The RPC function 'submit_public_gate_pass' does not exist yet
      throw new Error(
        "Public gate pass feature is not yet configured. " +
        "Database migration required to enable this feature."
      );
    },
    onError: (error) => {
      toast.error(`Failed to submit: ${error.message}`);
    },
  });
}

/**
 * Get public gate pass status by token
 * NOTE: This requires the database migration to be applied first.
 * The RPC function 'get_public_gate_pass_status' must exist in the database.
 */
export function usePublicGatePassStatus(tenantSlug: string | undefined, token: string | undefined) {
  return useQuery({
    queryKey: ["public-gate-pass-status", tenantSlug, token],
    queryFn: async (): Promise<PublicGatePassStatusResponse> => {
      // TODO: Enable after database migration is applied
      // The RPC function 'get_public_gate_pass_status' does not exist yet
      throw new Error(
        "Public gate pass feature is not yet configured. " +
        "Database migration required to enable this feature."
      );
    },
    enabled: false, // Disabled until migration is applied
    staleTime: 10000,
  });
}

/**
 * Subscribe to real-time status updates for a public gate pass
 * This hook properly manages the subscription lifecycle using useEffect
 */
export function usePublicGatePassRealtime(gatePassId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!gatePassId) return;

    // Subscribe to changes on the specific gate pass
    const channel = supabase
      .channel(`public-gate-pass-${gatePassId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "material_gate_passes",
          filter: `id=eq.${gatePassId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gatePassId, onUpdate]);
}

/**
 * Get the stored public access token from localStorage
 */
export function getStoredPublicToken(): string | null {
  return localStorage.getItem("public_gate_pass_token");
}

/**
 * Clear the stored public access token
 */
export function clearStoredPublicToken(): void {
  localStorage.removeItem("public_gate_pass_token");
}
