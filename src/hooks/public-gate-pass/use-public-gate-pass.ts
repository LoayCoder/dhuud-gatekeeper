import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Import types from centralized types file
import type {
  PublicGatePassSubmission,
  PublicGatePassSubmissionResult,
  PublicGatePassStatusResponse,
  PublicGatePassItem,
} from "@/types/public-gate-pass.types";

// Re-export types for convenience
export type {
  PublicGatePassSubmission,
  PublicGatePassSubmissionResult,
  PublicGatePassStatusResponse,
  PublicGatePassStatusData,
  PublicGatePassStatus,
  GatePassType,
  PublicGatePassItem,
} from "@/types/public-gate-pass.types";

/**
 * Get client IP address for rate limiting
 * This is a best-effort approach; actual IP validation happens server-side
 */
async function getClientIP(): Promise<string | null> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
}

/**
 * Submit a public gate pass request
 */
export function useSubmitPublicGatePass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PublicGatePassSubmission): Promise<PublicGatePassSubmissionResult> => {
      // Get client IP for rate limiting
      const clientIp = await getClientIP();

      // Prepare items array for RPC
      const itemsJsonb = data.items?.map(item => ({
        sr_number: item.sr_number || null,
        item_name: item.item_name,
        description: item.description || null,
        quantity: item.quantity || null,
        unit: item.unit || null,
        photo_path: item.photo_path || null,
        photo_file_name: item.photo_file_name || null,
        photo_file_size: item.photo_file_size || null,
        photo_mime_type: item.photo_mime_type || null,
      })) || [];

      // Call the RPC function using .rpc() with type assertion
      const { data: result, error } = await supabase.rpc(
        "submit_public_gate_pass" as never,
        {
          p_tenant_slug: data.tenant_slug,
          p_branch_id: data.branch_id || null,
          p_requester_name: data.requester_name,
          p_requester_phone: data.requester_phone,
          p_requester_email: data.requester_email || null,
          p_requester_company: data.requester_company || null,
          p_pass_type: data.pass_type,
          p_material_description: data.material_description || null,
          p_quantity: data.quantity || null,
          p_vehicle_plate: data.vehicle_plate || null,
          p_vehicle_plate_letters: data.vehicle_plate_letters || null,
          p_vehicle_plate_numbers: data.vehicle_plate_numbers || null,
          p_driver_name: data.driver_name || null,
          p_driver_mobile: data.driver_mobile || null,
          p_pass_date: data.pass_date || data.start_date,
          p_start_date: data.start_date,
          p_end_date: data.end_date,
          p_notify_whatsapp: data.notify_whatsapp ?? true,
          p_notify_email: data.notify_email ?? true,
          p_notify_sms: data.notify_sms ?? false,
          p_client_ip: clientIp,
          p_items: itemsJsonb,
        } as never
      );

      if (error) throw error;
      
      // Store the submission data for use in onSuccess
      (result as PublicGatePassSubmissionResult & { _submissionData?: PublicGatePassSubmission })._submissionData = data;
      
      return result as unknown as PublicGatePassSubmissionResult;
    },
    onSuccess: async (result, variables) => {
      if (result.success) {
        // Store token in localStorage for status page
        if (result.public_access_token) {
          localStorage.setItem("public_gate_pass_token", result.public_access_token);
        }
        
        // Build material description from items for notification
        const materialDescription = variables.items?.map(i => i.item_name).join(', ') 
          || variables.material_description 
          || '';
        
        // Trigger WhatsApp notification to requester AND staff (fire-and-forget)
        try {
          console.log('[Public Gate Pass] Triggering notification for:', result.reference_number);
          await supabase.functions.invoke('notify-public-gate-pass', {
            body: {
              gate_pass_id: result.gate_pass_id,
              tenant_id: variables.tenant_id,
              branch_id: variables.branch_id,
              reference_number: result.reference_number,
              requester_name: variables.requester_name,
              requester_phone: variables.requester_phone,
              requester_email: variables.requester_email,
              requester_company: variables.requester_company,
              material_description: materialDescription,
              pass_date: variables.start_date,
              tracking_url: `/${variables.tenant_slug}/track/${result.public_access_token}`,
              event_type: 'submitted',
            }
          });
          console.log('[Public Gate Pass] Notification triggered successfully');
        } catch (err) {
          // Don't fail the submission - notification is best-effort
          console.error('[Public Gate Pass] Notification failed:', err);
        }
        
        toast.success("Gate pass request submitted successfully!");
      } else {
        toast.error(result.error || "Failed to submit gate pass request");
      }
    },
    onError: (error) => {
      toast.error(`Failed to submit: ${error.message}`);
    },
  });
}

/**
 * Get public gate pass status by token
 */
export function usePublicGatePassStatus(tenantSlug: string | undefined, token: string | undefined) {
  return useQuery({
    queryKey: ["public-gate-pass-status", tenantSlug, token],
    queryFn: async (): Promise<PublicGatePassStatusResponse> => {
      if (!tenantSlug || !token) throw new Error("Tenant slug and token are required");

      // Call the RPC function using .rpc() with type assertion
      const { data, error } = await supabase.rpc(
        "get_public_gate_pass_status" as never,
        {
          p_tenant_slug: tenantSlug,
          p_access_token: token,
        } as never
      );

      if (error) throw error;
      return data as unknown as PublicGatePassStatusResponse;
    },
    enabled: !!tenantSlug && !!token,
    staleTime: 10000, // Consider stale after 10 seconds
    // Note: No refetchInterval - real-time updates are handled by usePublicGatePassRealtime
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
