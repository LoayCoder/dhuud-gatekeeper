import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PublicGatePassStatusResponse } from "@/types/public-gate-pass.types";

/**
 * Hook to fetch public gate pass status by access token
 * This works without authentication via Edge Function
 */
export function usePublicGatePassStatus(
  publicAccessToken: string | undefined,
  tenantSlug?: string
) {
  return useQuery({
    queryKey: ["public-gate-pass-status", publicAccessToken, tenantSlug],
    queryFn: async (): Promise<PublicGatePassStatusResponse> => {
      if (!publicAccessToken) {
        return { success: false, error: "No access token provided" };
      }

      const { data, error } = await supabase.functions.invoke("get-public-gate-pass-status", {
        body: {
          token: publicAccessToken,
          tenant_slug: tenantSlug,
        },
      });

      if (error) {
        console.error("Error fetching gate pass status:", error);
        return {
          success: false,
          error: error.message || "Failed to fetch gate pass status",
        };
      }

      return data as PublicGatePassStatusResponse;
    },
    enabled: !!publicAccessToken,
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
    staleTime: 10000, // Consider stale after 10 seconds
  });
}

/**
 * Get status display info (color, icon, label)
 */
export function getStatusDisplayInfo(status: string): {
  label: string;
  labelAr: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case "pending_management":
    case "pending_pm":
    case "pending_dept_approval":
    case "pending_contractor_approval":
      return {
        label: "Pending Review",
        labelAr: "قيد المراجعة",
        color: "text-amber-600",
        bgColor: "bg-amber-100",
      };
    case "pending_security_approval":
    case "pending_dept_ack":
    case "pending_safety":
      return {
        label: "Management Approved",
        labelAr: "تمت موافقة الإدارة",
        color: "text-blue-600",
        bgColor: "bg-blue-100",
      };
    case "approved":
      return {
        label: "Approved",
        labelAr: "موافق عليه",
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    case "rejected":
      return {
        label: "Rejected",
        labelAr: "مرفوض",
        color: "text-red-600",
        bgColor: "bg-red-100",
      };
    case "used":
      return {
        label: "Used",
        labelAr: "مُستخدم",
        color: "text-gray-600",
        bgColor: "bg-gray-100",
      };
    case "expired":
      return {
        label: "Expired",
        labelAr: "منتهي الصلاحية",
        color: "text-orange-600",
        bgColor: "bg-orange-100",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        labelAr: "ملغي",
        color: "text-gray-600",
        bgColor: "bg-gray-100",
      };
    default:
      return {
        label: "Unknown",
        labelAr: "غير معروف",
        color: "text-gray-500",
        bgColor: "bg-gray-100",
      };
  }
}

/**
 * Get pass type display
 */
export function getPassTypeDisplay(passType: string): { label: string; labelAr: string } {
  switch (passType) {
    case "in":
      return { label: "Entry Only", labelAr: "دخول فقط" };
    case "out":
      return { label: "Exit Only", labelAr: "خروج فقط" };
    case "in_out":
      return { label: "Entry & Exit", labelAr: "دخول وخروج" };
    default:
      return { label: passType, labelAr: passType };
  }
}
