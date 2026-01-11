import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialGatePass, GatePassFilters } from "./use-material-gate-passes";

/**
 * Fetch gate passes created by the current user
 */
export function useMyGatePasses(filters: GatePassFilters = {}) {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["my-gate-passes", tenantId, user?.id, filters],
    queryFn: async () => {
      if (!tenantId || !user?.id) return [];

      let query = supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, project_id, company_id, pass_type, material_description,
          quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
          time_window_start, time_window_end, status, requested_by,
          pm_approved_by, pm_approved_at, pm_notes,
          safety_approved_by, safety_approved_at, safety_notes,
          rejected_by, rejected_at, rejection_reason,
          guard_verified_by, guard_verified_at, entry_time, exit_time, created_at,
          is_internal_request, approval_from_id,
          project:contractor_projects(project_name, company:contractor_companies(company_name)),
          company:contractor_companies(company_name),
          requester:profiles!requested_by(full_name)
        `)
        .eq("tenant_id", tenantId)
        .eq("requested_by", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.passDate) {
        query = query.eq("pass_date", filters.passDate);
      }
      if (filters.search) {
        query = query.or(
          `reference_number.ilike.%${filters.search}%,material_description.ilike.%${filters.search}%,vehicle_plate.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MaterialGatePass[];
    },
    enabled: !!tenantId && !!user?.id,
  });
}

export interface ApprovalHistoryPass extends MaterialGatePass {
  approvalAction: "approved" | "rejected";
  approvalRole: "pm" | "safety";
  approvalAt: string;
  approvalNotes: string | null;
}

/**
 * Fetch gate passes approved or rejected by the current user
 */
export function useGatePassApprovalHistory() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["gate-pass-approval-history", tenantId, user?.id],
    queryFn: async () => {
      if (!tenantId || !user?.id) return [];

      // Fetch passes where user was an approver or rejector
      const { data, error } = await supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, project_id, company_id, pass_type, material_description,
          quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
          time_window_start, time_window_end, status, requested_by,
          pm_approved_by, pm_approved_at, pm_notes,
          safety_approved_by, safety_approved_at, safety_notes,
          rejected_by, rejected_at, rejection_reason,
          guard_verified_by, guard_verified_at, entry_time, exit_time, created_at,
          is_internal_request, approval_from_id,
          project:contractor_projects(project_name, company:contractor_companies(company_name)),
          company:contractor_companies(company_name),
          requester:profiles!requested_by(full_name)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .or(`pm_approved_by.eq.${user.id},safety_approved_by.eq.${user.id},rejected_by.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform to include approval action details
      const passes: ApprovalHistoryPass[] = (data || []).map((pass: MaterialGatePass) => {
        let approvalAction: "approved" | "rejected" = "approved";
        let approvalRole: "pm" | "safety" = "pm";
        let approvalAt = pass.pm_approved_at || "";
        let approvalNotes = pass.pm_notes;

        if (pass.rejected_by === user.id) {
          approvalAction = "rejected";
          approvalAt = pass.rejected_at || "";
          approvalNotes = pass.rejection_reason;
        } else if (pass.safety_approved_by === user.id) {
          approvalRole = "safety";
          approvalAt = pass.safety_approved_at || "";
          approvalNotes = pass.safety_notes;
        }

        return {
          ...pass,
          approvalAction,
          approvalRole,
          approvalAt,
          approvalNotes,
        };
      });

      return passes;
    },
    enabled: !!tenantId && !!user?.id,
  });
}

/**
 * Check if current user is a gate pass approver
 */
export function useIsGatePassApprover() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["is-gate-pass-approver", tenantId, user?.id],
    queryFn: async () => {
      if (!tenantId || !user?.id) return false;

      const { data, error } = await supabase
        .from("gate_pass_approvers")
        .select("id, approver_scope")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
    enabled: !!tenantId && !!user?.id,
  });
}
