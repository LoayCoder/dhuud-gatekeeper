import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GatePassVerificationResult {
  valid: boolean;
  message: string;
  gatePass?: {
    id: string;
    reference_number: string;
    pass_type: string;
    pass_date: string;
    time_window_start: string | null;
    time_window_end: string | null;
    material_description: string;
    quantity: string | null;
    vehicle_plate: string | null;
    driver_name: string | null;
    driver_mobile: string | null;
    status: string;
    entry_confirmed_at: string | null;
    exit_confirmed_at: string | null;
    project_name: string;
    company_name: string;
  };
}

export function useVerifyGatePassQR() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (qrToken: string): Promise<GatePassVerificationResult> => {
      if (!tenantId) throw new Error("Not authenticated");

      // Find gate pass by QR token
      const { data: gatePass, error } = await supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, pass_type, pass_date, time_window_start, time_window_end,
          material_description, quantity, vehicle_plate, driver_name, driver_mobile,
          status, entry_confirmed_at, exit_confirmed_at, qr_code_token, qr_generated_at,
          pm_approved_at, safety_approved_at,
          project:contractor_projects(project_name, company:contractor_companies(company_name))
        `)
        .eq("qr_code_token", qrToken)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (error || !gatePass) {
        return { valid: false, message: "Invalid QR code - Gate pass not found" };
      }

      // Check if pass is fully approved
      if (!gatePass.pm_approved_at || !gatePass.safety_approved_at) {
        return { valid: false, message: "Gate pass not yet fully approved" };
      }

      // Check if pass date is today
      const today = new Date().toISOString().split("T")[0];
      if (gatePass.pass_date !== today) {
        return { 
          valid: false, 
          message: gatePass.pass_date < today 
            ? "Gate pass has expired" 
            : "Gate pass is for a future date" 
        };
      }

      // Check time window if specified
      if (gatePass.time_window_start && gatePass.time_window_end) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        
        if (currentTime < gatePass.time_window_start || currentTime > gatePass.time_window_end) {
          return { 
            valid: false, 
            message: `Gate pass valid only between ${gatePass.time_window_start} - ${gatePass.time_window_end}` 
          };
        }
      }

      return {
        valid: true,
        message: "Gate pass verified successfully",
        gatePass: {
          id: gatePass.id,
          reference_number: gatePass.reference_number,
          pass_type: gatePass.pass_type,
          pass_date: gatePass.pass_date,
          time_window_start: gatePass.time_window_start,
          time_window_end: gatePass.time_window_end,
          material_description: gatePass.material_description,
          quantity: gatePass.quantity,
          vehicle_plate: gatePass.vehicle_plate,
          driver_name: gatePass.driver_name,
          driver_mobile: gatePass.driver_mobile,
          status: gatePass.status,
          entry_confirmed_at: gatePass.entry_confirmed_at,
          exit_confirmed_at: gatePass.exit_confirmed_at,
          project_name: gatePass.project?.project_name || "",
          company_name: gatePass.project?.company?.company_name || "",
        },
      };
    },
  });
}

export function useConfirmGatePassEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (gatePassId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("material_gate_passes")
        .update({
          entry_confirmed_at: new Date().toISOString(),
          entry_confirmed_by: user.id,
        })
        .eq("id", gatePassId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["today-approved-passes"] });
      toast.success("Entry confirmed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useConfirmGatePassExit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (gatePassId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("material_gate_passes")
        .update({
          exit_confirmed_at: new Date().toISOString(),
          exit_confirmed_by: user.id,
          status: "completed",
        })
        .eq("id", gatePassId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["today-approved-passes"] });
      toast.success("Exit confirmed - Pass completed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
