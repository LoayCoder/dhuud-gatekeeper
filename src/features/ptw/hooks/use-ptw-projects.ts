import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchFilter } from "@/hooks/use-branch-filter";
import { toast } from "sonner";
import type { PTWProjectFilters } from '@/features/ptw';

export interface PTWProject {
  id: string;
  tenant_id: string;
  reference_id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  site_id: string | null;
  contractor_company_id: string | null;
  project_manager_id: string | null;
  linked_contractor_project_id: string | null;
  is_internal_work: boolean;
  start_date: string;
  end_date: string;
  status: string;
  mobilization_percentage: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  site?: { name: string } | null;
  contractor_company?: { company_name: string } | null;
  project_manager?: { full_name: string } | null;
  linked_contractor_project?: { project_code: string; project_name: string } | null;
}

export interface PTWClearanceCheck {
  id: string;
  project_id: string;
  requirement_name: string;
  requirement_name_ar: string | null;
  category: string;
  is_mandatory: boolean;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  comments: string | null;
  sort_order: number;
  approver?: { full_name: string } | null;
}

export function usePTWProjects(filters: PTWProjectFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();

  return useQuery({
    queryKey: ["ptw-projects", tenantId, filters, ...branchQueryKey],
    queryFn: async () => {
      if (!tenantId) return [];
      const { getPTWProjects } = await import("@/features/ptw/services/ptwProjectService");
      return getPTWProjects(tenantId, filters, branchIds || [], isAllBranchesMode) as Promise<PTWProject[]>;
    },
    enabled: !!tenantId,
  });
}

export function usePTWProjectClearances(projectId: string | undefined) {
  return useQuery({
    queryKey: ["ptw-clearances", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { getPTWProjectClearances } = await import("@/features/ptw/services/ptwProjectService");
      return getPTWProjectClearances(projectId) as Promise<PTWClearanceCheck[]>;
    },
    enabled: !!projectId,
  });
}

export function useCreatePTWProject() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<PTWProject>) => {
      if (!profile?.tenant_id || !user?.id) throw new Error("No tenant");
      const { createPTWProject } = await import("@/features/ptw/services/ptwProjectService");
      return createPTWProject(data, profile.tenant_id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ptw-projects"] });
      toast.success("PTW Project created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useApproveClearanceCheck() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ checkId, comments }: { checkId: string; comments?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { approveClearanceCheck } = await import("@/features/ptw/services/ptwProjectService");
      return approveClearanceCheck(checkId, user.id, comments);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ptw-clearances", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["ptw-projects"] });
      queryClient.invalidateQueries({ queryKey: ["mobilization-check", data.project_id] });
      toast.success("Clearance approved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRejectClearanceCheck() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ checkId, comments }: { checkId: string; comments: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { rejectClearanceCheck } = await import("@/features/ptw/services/ptwProjectService");
      return rejectClearanceCheck(checkId, user.id, comments);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ptw-clearances", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["ptw-projects"] });
      queryClient.invalidateQueries({ queryKey: ["mobilization-check", data.project_id] });
      toast.success("Clearance rejected");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

