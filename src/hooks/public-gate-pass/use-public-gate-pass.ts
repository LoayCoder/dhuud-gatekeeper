import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types for public gate pass
export interface PublicGatePassSubmission {
  tenant_slug: string;
  branch_id?: string;
  requester_name: string;
  requester_phone: string; // E.164 format
  requester_email?: string;
  requester_company?: string;
  pass_type: "in" | "out" | "in_out";
  material_description: string;
  quantity?: string;
  vehicle_plate?: string;
  driver_name?: string;
  driver_mobile?: string;
  pass_date: string; // YYYY-MM-DD
  time_window_start?: string; // HH:MM
  time_window_end?: string; // HH:MM
  notify_whatsapp?: boolean;
  notify_email?: boolean;
  notify_sms?: boolean;
}

export interface PublicGatePassResult {
  success: boolean;
  error?: string;
  gate_pass_id?: string;
  reference_number?: string;
  public_access_token?: string;
  tracking_url?: string;
}

export interface PublicGatePassStatus {
  id: string;
  reference_number: string;
  status: string;
  pass_type: string;
  pass_date: string;
  time_window_start: string | null;
  time_window_end: string | null;
  material_description: string;
  quantity: string | null;
  vehicle_plate: string | null;
  driver_name: string | null;
  driver_mobile: string | null;
  requester_name: string;
  requester_phone: string;
  requester_company: string | null;
  created_at: string;
  pm_approved_at: string | null;
  safety_approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  entry_time: string | null;
  exit_time: string | null;
}

export interface PublicGatePassStatusResponse {
  success: boolean;
  error?: string;
  gate_pass?: PublicGatePassStatus;
  branch?: {
    name: string;
    location: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
  };
  tenant?: {
    name: string;
    logo_url: string | null;
    brand_color: string;
    instructions: string | null;
    instructions_ar: string | null;
  };
}

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
    mutationFn: async (data: PublicGatePassSubmission): Promise<PublicGatePassResult> => {
      // Get client IP for rate limiting
      const clientIp = await getClientIP();

      const { data: result, error } = await supabase.rpc("submit_public_gate_pass", {
        p_tenant_slug: data.tenant_slug,
        p_branch_id: data.branch_id || null,
        p_requester_name: data.requester_name,
        p_requester_phone: data.requester_phone,
        p_requester_email: data.requester_email || null,
        p_requester_company: data.requester_company || null,
        p_pass_type: data.pass_type,
        p_material_description: data.material_description,
        p_quantity: data.quantity || null,
        p_vehicle_plate: data.vehicle_plate || null,
        p_driver_name: data.driver_name || null,
        p_driver_mobile: data.driver_mobile || null,
        p_pass_date: data.pass_date,
        p_time_window_start: data.time_window_start || null,
        p_time_window_end: data.time_window_end || null,
        p_notify_whatsapp: data.notify_whatsapp ?? true,
        p_notify_email: data.notify_email ?? true,
        p_notify_sms: data.notify_sms ?? false,
        p_client_ip: clientIp,
      });

      if (error) throw error;
      return result as PublicGatePassResult;
    },
    onSuccess: (result) => {
      if (result.success) {
        // Store token in localStorage for status page
        if (result.public_access_token) {
          localStorage.setItem("public_gate_pass_token", result.public_access_token);
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

      const { data, error } = await supabase.rpc("get_public_gate_pass_status", {
        p_tenant_slug: tenantSlug,
        p_access_token: token,
      });

      if (error) throw error;
      return data as PublicGatePassStatusResponse;
    },
    enabled: !!tenantSlug && !!token,
    refetchInterval: 30000, // Poll every 30 seconds for status updates
    staleTime: 10000, // Consider stale after 10 seconds
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
