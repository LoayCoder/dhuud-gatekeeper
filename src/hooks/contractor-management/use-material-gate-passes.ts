import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MaterialGatePass {
  id: string;
  project_id: string;
  pass_number: string;
  pass_type: string;
  material_description: string;
  quantity: string | null;
  vehicle_number: string | null;
  driver_name: string | null;
  expected_date: string;
  expected_time: string | null;
  status: string;
  created_at: string;
  project?: { project_name: string; company?: { company_name: string } } | null;
}

export interface GatePassFilters {
  search?: string;
  projectId?: string;
  status?: string;
}

// Mock hook - table doesn't exist yet
export function useMaterialGatePasses(filters: GatePassFilters = {}) {
  return useQuery({
    queryKey: ["material-gate-passes", filters],
    queryFn: async () => [] as MaterialGatePass[],
  });
}

export function usePendingGatePassApprovals() {
  return useQuery({
    queryKey: ["pending-gate-pass-approvals"],
    queryFn: async () => [] as MaterialGatePass[],
  });
}

export function useTodayApprovedPasses() {
  return useQuery({
    queryKey: ["today-approved-passes"],
    queryFn: async () => [] as MaterialGatePass[],
  });
}

export function useCreateGatePass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<MaterialGatePass>) => {
      toast.info("Gate passes table not yet created");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
    },
  });
}

export function useApproveGatePass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ passId, approvalType }: { passId: string; approvalType: "pm" | "safety" }) => {
      toast.info("Gate passes table not yet created");
      return { passId, approvalType };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
    },
  });
}

export function useRejectGatePass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ passId, reason }: { passId: string; reason: string }) => {
      toast.info("Gate passes table not yet created");
      return { passId, reason };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
    },
  });
}

export function useVerifyGatePass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ passId, action }: { passId: string; action: "entry" | "exit" }) => {
      toast.info("Gate passes table not yet created");
      return { passId, action };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
    },
  });
}
