import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  BulkResult
} from '@/features/contractors';

export interface MaterialGatePass {
  id: string;
  reference_number: string;
  project_id: string | null;
  company_id: string | null;
  pass_type: string;
  material_description: string;
  quantity: string | null;
  vehicle_plate: string | null;
  driver_name: string | null;
  driver_mobile: string | null;
  pass_date: string; // Pass validity date
  start_date?: string | null; // Start date (if date range is used)
  end_date?: string | null; // End date (if date range is used)
  time_window_start: string | null;
  time_window_end: string | null;
  status: string;
  requested_by: string;
  pm_approved_by: string | null;
  pm_approved_at: string | null;
  pm_notes: string | null;
  safety_approved_by: string | null;
  safety_approved_at: string | null;
  safety_notes: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  guard_verified_by: string | null;
  guard_verified_at: string | null;
  entry_time: string | null;
  exit_time: string | null;
  created_at: string;
  is_internal_request: boolean;
  approval_from_id: string | null;
  // Renewal tracking (optional, added via migration)
  renewal_count?: number;
  renewed_by?: string | null;
  renewed_at?: string | null;
  renewal_expires_at?: string | null;
  project?: { project_name: string; company?: { company_name: string } } | null;
  company?: { company_name: string } | null;
  approval_from?: { full_name: string } | null;
  requester?: { full_name: string } | null;
  is_public_request?: boolean;
  public_requester_name?: string | null;
  public_requester_phone?: string | null;
  public_requester_email?: string | null;
  public_requester_company?: string | null;
}

export interface GatePassFilters {
  search?: string;
  projectId?: string;
  companyId?: string;
  status?: string;
  passDate?: string;
}

export interface GatePassItemInput {
  item_name: string;
  description?: string;
  quantity?: string;
  unit?: string;
  photos?: File[];  // Required photos array for item-level photos
}

export interface CreateGatePassData {
  project_id?: string; // Optional for internal users
  company_id?: string; // Optional for internal users
  pass_type: string;
  pm_approved_by?: string;
  approval_from_id?: string; // For internal requests - selected approver
  is_internal_request?: boolean;
  vehicle_plate?: string;
  driver_name?: string;
  driver_mobile?: string;
  pass_date?: string; // Pass validity date
  start_date?: string; // Pass validity start date (future use)
  end_date?: string; // Pass validity end date (future use)
  time_window_start?: string;
  time_window_end?: string;
  items: GatePassItemInput[];
  photos: File[];
}

export function useMaterialGatePasses(filters: GatePassFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["material-gate-passes", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];
      const { getMaterialGatePasses } = await import('@/features/contractors/services/materialGatePassQueryService');
      return getMaterialGatePasses(tenantId, filters);
    },
    enabled: !!tenantId,
  });
}

export function usePendingGatePassApprovals() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["pending-gate-pass-approvals", tenantId, user?.id],
    queryFn: async () => {
      if (!tenantId || !user?.id) return [];
      const { getPendingGatePassApprovals } = await import('@/features/contractors/services/materialGatePassQueryService');
      return getPendingGatePassApprovals(tenantId, user.id);
    },
    enabled: !!tenantId && !!user?.id,
  });
}

export function useTodayApprovedPasses() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["today-approved-passes", tenantId, today],
    queryFn: async () => {
      if (!tenantId) return [];
      const { getTodayApprovedPasses } = await import('@/features/contractors/services/materialGatePassQueryService');
      return getTodayApprovedPasses(tenantId);
    },
    enabled: !!tenantId,
  });
}

export function useCreateGatePass() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (data: CreateGatePassData) => {
      if (!tenantId || !user?.id) throw new Error("Not authenticated");
      const { createGatePass } = await import('@/features/contractors/services/materialGatePassCreateService');
      return createGatePass(data, tenantId, user.id, profile?.full_name || 'Unknown');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      toast.success("Gate pass created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create gate pass: ${error.message}`);
    },
  });
}

export function useApproveGatePass() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ passId, action, notes }: { passId: string; action: "approve" | "reject"; notes?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { approveGatePass } = await import('@/features/contractors/services/materialGatePassActionService');
      return approveGatePass(passId, action, notes, user.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-gate-pass-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["today-approved-passes"] });
      queryClient.invalidateQueries({ queryKey: ["my-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });

      if (result.newStatus === "rejected") {
        toast.success("Gate pass rejected");
      } else if (result.newStatus === "approved") {
        toast.success("Gate pass fully approved - QR generated");
      } else {
        toast.success("Approval recorded - forwarded to next stage");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });
}

export function useRejectGatePass() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ passId, reason }: { passId: string; reason: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { rejectGatePass } = await import('@/features/contractors/services/materialGatePassActionService');
      return rejectGatePass(passId, reason, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-gate-pass-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["my-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });
      toast.success("Gate pass rejected");
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });
}

export function useVerifyGatePass() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ passId, action }: { passId: string; action: "entry" | "exit" }) => {
      if (!user?.id || !profile?.tenant_id) throw new Error("Not authenticated");
      const { verifyGatePass } = await import('@/features/contractors/services/materialGatePassActionService');
      return verifyGatePass(passId, action, profile.tenant_id, user.id);
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["today-approved-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-entries"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });
      toast.success(action === "entry" ? "Entry recorded" : "Exit recorded - pass completed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to verify: ${error.message}`);
    },
  });
}

interface BulkApproveParams {
  passIds: string[];
  notes?: string;
}

interface BulkRejectParams {
  passIds: string[];
  reason: string;
}

export function useBulkApproveGatePasses() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ passIds, notes }: BulkApproveParams): Promise<BulkResult> => {
      if (!user?.id) throw new Error("Not authenticated");
      const { bulkApproveGatePasses } = await import('@/features/contractors/services/materialGatePassActionService');
      return bulkApproveGatePasses(passIds, notes, user.id);
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-gate-pass-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["today-approved-passes"] });
      queryClient.invalidateQueries({ queryKey: ["my-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });

      if (results.success > 0 && results.failed === 0) {
        toast.success(`${results.success} passes approved`);
      } else if (results.success > 0 && results.failed > 0) {
        toast.warning(`${results.success} approved, ${results.failed} failed`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Bulk approval failed: ${error.message}`);
    },
  });
}

export function useBulkRejectGatePasses() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ passIds, reason }: BulkRejectParams): Promise<BulkResult> => {
      if (!user?.id) throw new Error("Not authenticated");
      const { bulkRejectGatePasses } = await import('@/features/contractors/services/materialGatePassActionService');
      return bulkRejectGatePasses(passIds, reason, user.id);
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-gate-pass-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["my-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });

      if (results.success > 0 && results.failed === 0) {
        toast.success(`${results.success} passes rejected`);
      } else if (results.success > 0 && results.failed > 0) {
        toast.warning(`${results.success} rejected, ${results.failed} failed`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Bulk rejection failed: ${error.message}`);
    },
  });
}

