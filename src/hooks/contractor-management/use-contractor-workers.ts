import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WorkerInduction {
  id: string;
  status: string;
  expires_at: string | null;
}

export interface ContractorWorker {
  id: string;
  tenant_id: string;
  company_id: string;
  full_name: string;
  full_name_ar: string | null;
  national_id: string;
  nationality: string | null;
  mobile_number: string;
  photo_path: string | null;
  preferred_language: string;
  approval_status: string;
  approved_at: string | null;
  approved_by?: string | null;
  rejection_reason: string | null;
  created_at: string;
  worker_type?: string; // 'worker' | 'site_representative' | 'safety_officer'
  safety_officer_id?: string | null;
  company?: { company_name: string } | null;
  latest_induction?: WorkerInduction | null;
  // Security approval stage fields
  security_approval_status?: string;
  security_approved_by?: string | null;
  security_approved_at?: string | null;
  security_rejection_reason?: string | null;
  // Who submitted the worker
  submitted_by?: string | null;
}

export interface ContractorWorkerFilters {
  search?: string;
  companyId?: string;
  approvalStatus?: string;
}

export function useContractorWorkers(filters: ContractorWorkerFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-workers", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("contractor_workers")
        .select(`
          id, tenant_id, company_id, full_name, full_name_ar, national_id, nationality,
          mobile_number, photo_path, preferred_language, approval_status, approved_at,
          rejection_reason, created_at, worker_type, safety_officer_id,
          company:contractor_companies(company_name),
          latest_induction:worker_inductions(id, status, expires_at)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,national_id.ilike.%${filters.search}%`);
      }
      if (filters.companyId) query = query.eq("company_id", filters.companyId);
      if (filters.approvalStatus) query = query.eq("approval_status", filters.approvalStatus);

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform latest_induction array to single object (prioritize acknowledged, then most recent)
      return (data || []).map((worker) => {
        let bestInduction = null;
        
        if (Array.isArray(worker.latest_induction) && worker.latest_induction.length > 0) {
          // First, try to find an acknowledged induction
          const acknowledgedInduction = worker.latest_induction.find(
            (i: any) => i.status === 'acknowledged'
          );
          
          if (acknowledgedInduction) {
            bestInduction = acknowledgedInduction;
          } else {
            // Otherwise, take the first one (most recent)
            bestInduction = worker.latest_induction[0];
          }
        }
        
        return {
          ...worker,
          latest_induction: bestInduction,
        };
      }) as ContractorWorker[];
    },
    enabled: !!tenantId,
  });
}

export function usePendingWorkerApprovals() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["pending-worker-approvals", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("contractor_workers")
        .select(`id, full_name, national_id, nationality, mobile_number, created_at, company_id, company:contractor_companies(company_name)`)
        .eq("tenant_id", tenantId)
        .eq("approval_status", "pending")
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ContractorWorker[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateContractorWorker() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<ContractorWorker>) => {
      if (!profile?.tenant_id) throw new Error("No tenant");

      const { data: result, error } = await supabase
        .from("contractor_workers")
        .insert({
          company_id: data.company_id!,
          full_name: data.full_name!,
          full_name_ar: data.full_name_ar,
          national_id: data.national_id!,
          nationality: data.nationality,
          mobile_number: data.mobile_number!,
          preferred_language: data.preferred_language || "en",
          tenant_id: profile.tenant_id,
          approval_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      toast.success("Worker added");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============= CONTRACTOR ADMIN/CONSULTANT ACCESS CHECK =============

export function useHasContractorApprovalAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contractor-approval-access", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc("has_contractor_approval_access", {
        p_user_id: user.id,
      });
      
      if (error) {
        console.error("Failed to check Contractor approval access:", error);
        return false;
      }
      
      return data === true;
    },
    enabled: !!user?.id,
  });
}

// ============= SECURITY APPROVAL ACCESS CHECK =============

export function useHasSecurityApprovalAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["security-approval-access", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc("has_security_approval_access", {
        p_user_id: user.id,
      });
      
      if (error) {
        console.error("Failed to check Security approval access:", error);
        return false;
      }
      
      return data === true;
    },
    enabled: !!user?.id,
  });
}

// Stage 1: Contractor Consultant OR Contractor Admin approves worker -> moves to pending_security
export function useApproveWorker() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (workerId: string) => {
      // Validate Contractor Admin/Consultant role before approving
      const { data: hasAccess } = await supabase.rpc("has_contractor_approval_access", {
        p_user_id: user?.id,
      });

      if (!hasAccess) {
        throw new Error("Only Contractor Consultants or Contractor Admins can approve workers at this stage");
      }

      const { data, error } = await supabase
        .from("contractor_workers")
        .update({ 
          approval_status: "pending_security",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", workerId)
        .select("id, full_name, tenant_id, company_id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-security-approvals"] });
      toast.success("Worker approved - pending security review");

      // Log audit event
      try {
        await supabase.functions.invoke("contractor-audit-log", {
          body: {
            entity_type: "contractor_worker",
            entity_id: data.id,
            action: "worker_stage1_approved",
            old_value: { approval_status: "pending" },
            new_value: { approval_status: "pending_security", full_name: data.full_name },
            tenant_id: data.tenant_id,
          },
        });
      } catch (e) {
        console.error("Failed to log audit event:", e);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Stage 2: Security Supervisor OR Security Manager final approval
export function useSecurityApproveWorker() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (workerId: string) => {
      // Validate Security Supervisor/Manager role before approving
      const { data: hasAccess } = await supabase.rpc("has_security_approval_access", {
        p_user_id: user?.id,
      });

      if (!hasAccess) {
        throw new Error("Only Security Supervisors or Security Managers can approve workers at this stage");
      }

      const { data, error } = await supabase
        .from("contractor_workers")
        .update({ 
          approval_status: "approved",
          security_approval_status: "approved",
          security_approved_at: new Date().toISOString(),
          security_approved_by: user?.id,
        })
        .eq("id", workerId)
        .select("id, full_name, tenant_id, company_id, mobile_number, preferred_language")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-security-approvals"] });
      toast.success("Worker approved by security");

      // Log audit event
      try {
        await supabase.functions.invoke("contractor-audit-log", {
          body: {
            entity_type: "contractor_worker",
            entity_id: data.id,
            action: "worker_security_approved",
            old_value: { approval_status: "pending_security" },
            new_value: { approval_status: "approved", full_name: data.full_name },
            tenant_id: data.tenant_id,
          },
        });
      } catch (e) {
        console.error("Failed to log audit event:", e);
      }

      // Send notification to contractor representatives
      try {
        await supabase.functions.invoke("send-contractor-notification", {
          body: {
            workerId: data.id,
            workerName: data.full_name,
            action: "worker_approved",
            tenant_id: data.tenant_id,
          },
        });
      } catch (e) {
        console.error("Failed to send notification:", e);
      }

      // Send safety induction video to the worker after approval
      try {
        await supabase.functions.invoke("send-induction-video", {
          body: {
            workerId: data.id,
            workerName: data.full_name,
            workerMobile: data.mobile_number,
            workerLanguage: data.preferred_language || "en",
            tenant_id: data.tenant_id,
          },
        });
        toast.info("Safety induction sent to worker");
      } catch (e) {
        console.error("Failed to send induction video:", e);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Security Supervisor/Manager rejection - Returns to PENDING status (not security_rejected)
export function useSecurityRejectWorker() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ workerId, reason }: { workerId: string; reason: string }) => {
      // Validate Security Supervisor/Manager role before rejecting
      const { data: hasAccess } = await supabase.rpc("has_security_approval_access", {
        p_user_id: user?.id,
      });

      if (!hasAccess) {
        throw new Error("Only Security Supervisors or Security Managers can reject workers at this stage");
      }

      // Get worker info including company_id for finding the contractor rep
      const { data: workerInfo } = await supabase
        .from("contractor_workers")
        .select("company_id")
        .eq("id", workerId)
        .single();

      // Return to PENDING status so contractor can address issues and resubmit
      const { data, error } = await supabase
        .from("contractor_workers")
        .update({ 
          approval_status: "pending", // Return to pending, NOT security_rejected
          security_approval_status: "rejected",
          security_approved_by: user?.id,
          security_approved_at: new Date().toISOString(),
          security_rejection_reason: reason,
          // Clear stage 1 approval so it goes through the whole flow again
          approved_at: null,
          approved_by: null,
        })
        .eq("id", workerId)
        .select("id, full_name, tenant_id")
        .single();

      if (error) throw error;
      return { ...data, reason, companyId: workerInfo?.company_id };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-security-approvals"] });
      toast.success("Worker returned to pending with security comments");

      // Log audit event
      try {
        await supabase.functions.invoke("contractor-audit-log", {
          body: {
            entity_type: "contractor_worker",
            entity_id: data.id,
            action: "worker_security_rejected",
            old_value: { approval_status: "pending_security" },
            new_value: { 
              approval_status: "pending", // Returned to pending
              security_rejection_reason: data.reason,
              full_name: data.full_name 
            },
            tenant_id: data.tenant_id,
          },
        });
      } catch (e) {
        console.error("Failed to log audit event:", e);
      }

      // Send rejection notification back to contractor representative
      try {
        await supabase.functions.invoke("send-contractor-notification", {
          body: {
            workerId: data.id,
            workerName: data.full_name,
            action: "worker_security_rejected",
            rejectionReason: data.reason,
            tenant_id: data.tenant_id,
            companyId: data.companyId,
          },
        });
      } catch (e) {
        console.error("Failed to send rejection notification:", e);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Fetch workers pending security approval (Stage 2)
export function usePendingSecurityApprovals() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["pending-security-approvals", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("contractor_workers")
        .select(`
          id, full_name, full_name_ar, national_id, nationality, mobile_number, 
          created_at, approved_at, photo_path, worker_type, company_id,
          company:contractor_companies(company_name)
        `)
        .eq("tenant_id", tenantId)
        .eq("approval_status", "pending_security")
        .is("deleted_at", null)
        .order("approved_at", { ascending: true });

      if (error) throw error;
      return data as ContractorWorker[];
    },
    enabled: !!tenantId,
  });
}

// Stage 1 Rejection by Contractor Consultant/Admin
export function useRejectWorker() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ workerId, reason }: { workerId: string; reason: string }) => {
      // Validate Contractor Admin/Consultant role before rejecting
      const { data: hasAccess } = await supabase.rpc("has_contractor_approval_access", {
        p_user_id: user?.id,
      });

      if (!hasAccess) {
        throw new Error("Only Contractor Consultants or Contractor Admins can reject workers at this stage");
      }

      // Get worker info for notification
      const { data: workerInfo } = await supabase
        .from("contractor_workers")
        .select("company_id")
        .eq("id", workerId)
        .single();

      const { data, error } = await supabase
        .from("contractor_workers")
        .update({ approval_status: "rejected", rejection_reason: reason })
        .eq("id", workerId)
        .select("id, full_name, tenant_id")
        .single();

      if (error) throw error;
      return { ...data, reason, companyId: workerInfo?.company_id };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      toast.success("Worker rejected");

      // Log audit event
      try {
        await supabase.functions.invoke("contractor-audit-log", {
          body: {
            entity_type: "contractor_worker",
            entity_id: data.id,
            action: "worker_rejected",
            old_value: { approval_status: "pending" },
            new_value: { approval_status: "rejected", rejection_reason: data.reason, full_name: data.full_name },
            tenant_id: data.tenant_id,
          },
        });
      } catch (e) {
        console.error("Failed to log audit event:", e);
      }

      // Send notification to contractor representatives with rejection reason
      try {
        await supabase.functions.invoke("send-contractor-notification", {
          body: {
            workerId: data.id,
            workerName: data.full_name,
            action: "worker_rejected",
            rejectionReason: data.reason,
            tenant_id: data.tenant_id,
            companyId: data.companyId,
          },
        });
      } catch (e) {
        console.error("Failed to send notification:", e);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useBulkApproveWorkers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workerIds: string[]) => {
      const { data, error } = await supabase
        .from("contractor_workers")
        .update({ approval_status: "approved", approved_at: new Date().toISOString() })
        .in("id", workerIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      toast.success(`${data.length} workers approved`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useBulkRejectWorkers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workerIds, reason }: { workerIds: string[]; reason: string }) => {
      const { data, error } = await supabase
        .from("contractor_workers")
        .update({ approval_status: "rejected", rejection_reason: reason })
        .in("id", workerIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      toast.success(`${data.length} workers rejected`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCheckDuplicateNationalId() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return async (nationalId: string, excludeWorkerId?: string): Promise<boolean> => {
    if (!tenantId || !nationalId) return false;

    let query = supabase
      .from("contractor_workers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("national_id", nationalId)
      .is("deleted_at", null);

    if (excludeWorkerId) {
      query = query.neq("id", excludeWorkerId);
    }

    const { data } = await query.maybeSingle();
    return !!data;
  };
}

export function useDeleteContractorWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workerId: string) => {
      const { error } = await supabase
        .from("contractor_workers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", workerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      toast.success("Worker deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateWorkerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workerId, status, reason }: { workerId: string; status: string; reason?: string }) => {
      const updates: Record<string, unknown> = {
        approval_status: status,
      };

      if (status === "approved") {
        updates.approved_at = new Date().toISOString();
        updates.rejection_reason = null;
      } else if (status === "rejected") {
        updates.rejection_reason = reason || null;
        updates.approved_at = null;
      } else if (status === "pending") {
        updates.approved_at = null;
        updates.rejection_reason = null;
      } else if (status === "revoked") {
        updates.rejection_reason = reason || null;
      }

      const { data, error } = await supabase
        .from("contractor_workers")
        .update(updates)
        .eq("id", workerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      toast.success("Worker status updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
