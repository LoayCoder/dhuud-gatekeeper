import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  PublicGatePassFormData,
  PublicGatePassSubmitResponse
} from "@/types/public-gate-pass.types";

/**
 * Hook to submit a public gate pass request
 * This calls the submit-public-gate-pass Edge Function
 */
export function usePublicGatePassSubmit() {
  return useMutation({
    mutationFn: async (formData: PublicGatePassFormData): Promise<PublicGatePassSubmitResponse> => {
      const { data, error } = await supabase.functions.invoke("submit-public-gate-pass", {
        body: formData,
      });

      if (error) {
        console.error("Error submitting public gate pass:", error);
        return {
          success: false,
          error: error.message || "Failed to submit gate pass request",
        };
      }

      return data as PublicGatePassSubmitResponse;
    },
  });
}

/**
 * Helper to validate phone number format (E.164)
 * Returns formatted number for WhatsApp routing
 */
export function validatePhoneNumber(phone: string): { isValid: boolean; formatted: string; error?: string } {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Check if it starts with +
  if (!cleaned.startsWith("+")) {
    // Try to add + if it looks like an international number
    if (cleaned.length >= 10 && cleaned.length <= 15) {
      const formatted = `+${cleaned}`;
      return { isValid: true, formatted };
    }
    return {
      isValid: false,
      formatted: cleaned,
      error: "Phone number must be in international format (e.g., +966501234567)"
    };
  }

  // Validate length (E.164 is 1-15 digits after +)
  const digits = cleaned.slice(1);
  if (digits.length < 7 || digits.length > 15) {
    return {
      isValid: false,
      formatted: cleaned,
      error: "Invalid phone number length"
    };
  }

  return { isValid: true, formatted: cleaned };
}

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Common Saudi Arabia format: +966 5X XXX XXXX
  if (cleaned.startsWith("+966") && cleaned.length === 13) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  // Generic international format
  if (cleaned.startsWith("+") && cleaned.length >= 10) {
    const countryCode = cleaned.slice(0, 4);
    const rest = cleaned.slice(4);
    return `${countryCode} ${rest.match(/.{1,3}/g)?.join(" ") || rest}`;
  }

  return phone;
}
