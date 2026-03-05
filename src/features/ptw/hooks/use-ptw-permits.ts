import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchFilter } from "@/hooks/use-branch-filter";
import { toast } from "sonner";
import type { PTWPermitFilters } from '@/features/ptw';

export interface PTWPermit {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  reference_id: string;
  project_id: string;
  type_id: string;
  status: string;
  site_id: string | null;
  building_id: string | null;
  floor_zone_id: string | null;
  location_details: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  applicant_id: string;
  endorser_id: string | null;
  issuer_id: string | null;
  planned_start_time: string;
  planned_end_time: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  extended_until: string | null;
  extension_count: number;
  simops_status: string | null;
  simops_notes: string | null;
  risk_assessment_ref: string | null;
  job_description: string | null;
  work_scope: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  evacuation_point: string | null;
  requested_at: string | null;
  endorsed_at: string | null;
  issued_at: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  closure_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  permit_type?: { name: string; code: string; color: string } | null;
  project?: { name: string; reference_id: string } | null;
  applicant?: { full_name: string } | null;
  issuer?: { full_name: string } | null;
  site?: { name: string } | null;
}

export function usePTWPermits(filters: PTWPermitFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const { queryKey: branchQueryKey } = useBranchFilter();

  return useQuery({
    queryKey: ["ptw-permits", tenantId, filters, ...branchQueryKey],
    queryFn: async () => {
      if (!tenantId) return [];
      const { getPTWPermits } = await import("@/features/ptw/services/ptwPermitService");
      return getPTWPermits(tenantId, filters) as Promise<PTWPermit[]>;
    },
    enabled: !!tenantId,
  });
}

export function usePTWPermit(permitId: string | undefined) {
  return useQuery({
    queryKey: ["ptw-permit", permitId],
    queryFn: async () => {
      if (!permitId) return null;
      const { getPTWPermit } = await import("@/features/ptw/services/ptwPermitService");
      return getPTWPermit(permitId) as Promise<PTWPermit>;
    },
    enabled: !!permitId,
  });
}

export function useCreatePTWPermit() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<PTWPermit> & { worker_ids?: string[]; permit_holder_id?: string }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error("No tenant");
      const { createPTWPermit } = await import("@/features/ptw/services/ptwPermitService");
      return createPTWPermit(data, profile.tenant_id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ptw-permits"] });
      toast.success("Permit created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePermitStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ permitId, status, notes }: { permitId: string; status: string; notes?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { updatePermitStatus } = await import("@/features/ptw/services/ptwPermitService");
      return updatePermitStatus(permitId, status, user.id, notes);
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["ptw-permits"] });
      queryClient.invalidateQueries({ queryKey: ["ptw-permit", data.id] });
      toast.success(`Permit ${data.status}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useActivePermitsForMap() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const { queryKey: branchQueryKey } = useBranchFilter();

  return useQuery({
    queryKey: ["ptw-permits-map", tenantId, ...branchQueryKey],
    queryFn: async () => {
      if (!tenantId) return [];
      const { getActivePermitsForMap } = await import("@/features/ptw/services/ptwPermitService");
      return getActivePermitsForMap(tenantId);
    },
    enabled: !!tenantId,
  });
}

export function useDeletePTWPermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permitId: string) => {
      const { deletePTWPermit } = await import("@/features/ptw/services/ptwPermitService");
      return deletePTWPermit(permitId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ptw-permits"] });
      toast.success("Permit deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

