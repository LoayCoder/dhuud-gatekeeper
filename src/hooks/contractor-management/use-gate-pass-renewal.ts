import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/use-user-roles";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface RenewalCheckResult {
  allowed: boolean;
  reason?: string;
}

interface RenewalResult {
  success: boolean;
  new_pass_date?: string;
  message?: string;
  reason?: string;
}

/**
 * Hook to check if a gate pass can be renewed by the current user
 */
export function useCanRenewGatePass(passId: string | undefined) {
  const { user, profile } = useAuth();
  const { hasRole } = useUserRoles();
  const isSecuritySupervisor = hasRole("security_supervisor") || hasRole("security_manager");

  return useQuery({
    queryKey: ["can-renew-gate-pass", passId, user?.id],
    queryFn: async (): Promise<RenewalCheckResult> => {
      if (!user?.id || !passId) {
        return { allowed: false, reason: "Not authenticated" };
      }

      if (!isSecuritySupervisor) {
        return { allowed: false, reason: "Only security supervisors can renew passes" };
      }

      const { data, error } = await supabase.rpc("can_renew_gate_pass", {
        p_gate_pass_id: passId,
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error checking renewal eligibility:", error);
        return { allowed: false, reason: error.message };
      }

      return data as RenewalCheckResult;
    },
    enabled: !!user?.id && !!passId && isSecuritySupervisor,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to renew an expired gate pass (security supervisor only)
 * Extends the pass validity by 24 hours from the current time
 */
export function useRenewGatePass() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      passId,
      notes,
    }: {
      passId: string;
      notes?: string;
    }): Promise<RenewalResult> => {
      if (!user?.id) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.rpc("renew_gate_pass", {
        p_gate_pass_id: passId,
        p_user_id: user.id,
        p_notes: notes || null,
      });

      if (error) {
        throw error;
      }

      const result = data as RenewalResult;
      if (!result.success) {
        throw new Error(result.reason || "Renewal failed");
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });
      queryClient.invalidateQueries({ queryKey: ["today-approved-passes"] });
      queryClient.invalidateQueries({ queryKey: ["my-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-gate-pass-approvals"] });

      toast.success(
        t(
          "contractors.gatePasses.renewalSuccess",
          `Pass renewed. New date: ${result.new_pass_date}`
        )
      );
    },
    onError: (error: Error) => {
      toast.error(
        t("contractors.gatePasses.renewalFailed", `Failed to renew: ${error.message}`)
      );
    },
  });
}

/**
 * Hook to get passes requiring resubmission for the current user
 */
export function usePassesRequiringResubmission() {
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["passes-requiring-resubmission", user?.id, tenantId],
    queryFn: async () => {
      if (!user?.id || !tenantId) return [];

      const { data, error } = await supabase
        .from("material_gate_passes")
        .select(
          `
          id, reference_number, pass_type, material_description, quantity,
          pass_date, original_pass_date, revert_reason, created_at,
          project:contractor_projects(project_name, company:contractor_companies(company_name))
        `
        )
        .eq("tenant_id", tenantId)
        .eq("requested_by", user.id)
        .eq("status", "resubmission_required")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!tenantId,
  });
}

/**
 * Hook to resubmit an expired gate pass (creates a new pass with same data)
 */
export function useResubmitGatePass() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      passId,
      newPassDate,
    }: {
      passId: string;
      newPassDate: string;
    }) => {
      if (!user?.id || !profile?.tenant_id) {
        throw new Error("Not authenticated");
      }

      // Get the original pass data
      const { data: originalPass, error: fetchError } = await supabase
        .from("material_gate_passes")
        .select("*")
        .eq("id", passId)
        .single();

      if (fetchError || !originalPass) {
        throw new Error("Original pass not found");
      }

      // Generate new reference number
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from("material_gate_passes")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", profile.tenant_id);

      const sequence = (count || 0) + 1;
      const reference_number = `GP-${year}-${String(sequence).padStart(5, "0")}`;

      // Create a new pass with the same data but new date
      const { data: newPass, error: insertError } = await supabase
        .from("material_gate_passes")
        .insert({
          tenant_id: profile.tenant_id,
          requested_by: user.id,
          reference_number,
          project_id: originalPass.project_id,
          company_id: originalPass.company_id,
          pass_type: originalPass.pass_type,
          material_description: originalPass.material_description,
          quantity: originalPass.quantity,
          vehicle_plate: originalPass.vehicle_plate,
          driver_name: originalPass.driver_name,
          driver_mobile: originalPass.driver_mobile,
          pass_date: newPassDate,
          time_window_start: originalPass.time_window_start,
          time_window_end: originalPass.time_window_end,
          is_internal_request: originalPass.is_internal_request,
          approval_from_id: originalPass.approval_from_id,
          status: originalPass.is_internal_request
            ? "pending_dept_approval"
            : "pending_contractor_approval",
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Copy items from original pass
      const { data: items } = await supabase
        .from("gate_pass_items")
        .select("*")
        .eq("gate_pass_id", passId);

      if (items && items.length > 0) {
        const newItems = items.map((item) => ({
          gate_pass_id: newPass.id,
          tenant_id: profile.tenant_id,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
        }));

        await supabase.from("gate_pass_items").insert(newItems);
      }

      // Mark original pass as cancelled
      await supabase
        .from("material_gate_passes")
        .update({
          status: "cancelled",
          rejection_reason: "Resubmitted as new pass: " + reference_number,
          updated_at: new Date().toISOString(),
        })
        .eq("id", passId);

      return newPass;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["passes-requiring-resubmission"] });
      queryClient.invalidateQueries({ queryKey: ["my-gate-passes"] });

      toast.success(
        t(
          "contractors.gatePasses.resubmitSuccess",
          `New pass created: ${data.reference_number}`
        )
      );
    },
    onError: (error: Error) => {
      toast.error(
        t("contractors.gatePasses.resubmitFailed", `Failed to resubmit: ${error.message}`)
      );
    },
  });
}
