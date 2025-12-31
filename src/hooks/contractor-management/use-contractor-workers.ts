import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  rejection_reason: string | null;
  created_at: string;
  company?: { company_name: string } | null;
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
          rejection_reason, created_at,
          company:contractor_companies(company_name)
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
      return data as ContractorWorker[];
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
        .select(`id, full_name, national_id, nationality, mobile_number, created_at, company:contractor_companies(company_name)`)
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
  const { profile } = useAuth();

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

export function useApproveWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workerId: string) => {
      const { data, error } = await supabase
        .from("contractor_workers")
        .update({ approval_status: "approved", approved_at: new Date().toISOString() })
        .eq("id", workerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      toast.success("Worker approved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRejectWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workerId, reason }: { workerId: string; reason: string }) => {
      const { data, error } = await supabase
        .from("contractor_workers")
        .update({ approval_status: "rejected", rejection_reason: reason })
        .eq("id", workerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-workers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-worker-approvals"] });
      toast.success("Worker rejected");
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
