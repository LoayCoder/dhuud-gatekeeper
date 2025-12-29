import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

export interface PTWProjectFilters {
  search?: string;
  status?: string;
  siteId?: string;
  contractorId?: string;
}

export function usePTWProjects(filters: PTWProjectFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["ptw-projects", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("ptw_projects")
        .select(`
          id, tenant_id, reference_id, name, name_ar, description,
          site_id, contractor_company_id, project_manager_id, linked_contractor_project_id,
          is_internal_work, start_date, end_date, status, mobilization_percentage,
          created_by, created_at, updated_at,
          site:sites(name),
          contractor_company:contractor_companies(company_name),
          project_manager:profiles!ptw_projects_project_manager_id_fkey(full_name),
          linked_contractor_project:contractor_projects(project_code, project_name)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,reference_id.ilike.%${filters.search}%`);
      }
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.siteId) query = query.eq("site_id", filters.siteId);
      if (filters.contractorId) query = query.eq("contractor_company_id", filters.contractorId);

      const { data, error } = await query;
      if (error) throw error;
      return data as PTWProject[];
    },
    enabled: !!tenantId,
  });
}

export function usePTWProjectClearances(projectId: string | undefined) {
  return useQuery({
    queryKey: ["ptw-clearances", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("ptw_clearance_checks")
        .select(`
          id, project_id, requirement_name, requirement_name_ar, category,
          is_mandatory, status, approved_by, approved_at, comments, sort_order,
          approver:profiles!ptw_clearance_checks_approved_by_fkey(full_name)
        `)
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("sort_order");

      if (error) throw error;
      return data as PTWClearanceCheck[];
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

      const insertData = {
        name: data.name!,
        name_ar: data.name_ar,
        description: data.description,
        site_id: data.site_id,
        contractor_company_id: data.contractor_company_id,
        project_manager_id: data.project_manager_id,
        linked_contractor_project_id: data.linked_contractor_project_id,
        is_internal_work: data.is_internal_work ?? false,
        start_date: data.start_date!,
        end_date: data.end_date!,
        tenant_id: profile.tenant_id,
        created_by: user.id,
      };

      const { data: result, error } = await supabase
        .from("ptw_projects")
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return result;
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

      const { data, error } = await supabase
        .from("ptw_clearance_checks")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          comments,
        })
        .eq("id", checkId)
        .select("project_id")
        .single();

      if (error) throw error;
      return data;
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

      const { data, error } = await supabase
        .from("ptw_clearance_checks")
        .update({
          status: "rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          comments,
        })
        .eq("id", checkId)
        .select("project_id")
        .single();

      if (error) throw error;
      return data;
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
