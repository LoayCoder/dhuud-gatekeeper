import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Hook for contractor representatives to access their company data
 * Uses RLS policies to restrict access to only their company's data
 */
export function useContractorRepresentative() {
  const { user, profile } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["contractor-representative", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("contractor_representatives")
        .select(`
          id, company_id, full_name, email, mobile_number, is_primary,
          company:contractor_companies(id, company_name, company_name_ar, status, email, phone)
        `)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useContractorPortalProjects(companyId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-portal-projects", companyId],
    queryFn: async () => {
      if (!companyId || !tenantId) return [];

      const { data, error } = await supabase
        .from("contractor_projects")
        .select(`
          id, project_code, project_name, project_name_ar, status, start_date,
          end_date, assigned_workers_count, required_safety_officers, location_description,
          site:sites(name)
        `)
        .eq("company_id", companyId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!tenantId,
  });
}

export function useContractorPortalWorkers(companyId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-portal-workers", companyId],
    queryFn: async () => {
      if (!companyId || !tenantId) return [];

      const { data, error } = await supabase
        .from("contractor_workers")
        .select(`
          id, full_name, full_name_ar, national_id, nationality, mobile_number,
          preferred_language, approval_status, approved_at, created_at,
          edit_pending_approval, edited_by, edited_at
        `)
        .eq("company_id", companyId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!tenantId,
  });
}

export function useContractorPortalGatePasses(companyId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-portal-gate-passes", companyId],
    queryFn: async () => {
      if (!companyId || !tenantId) return [];

      const { data, error } = await supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, pass_type, quantity,
          vehicle_plate, driver_name, pass_date, status,
          pm_approved_at, safety_approved_at, created_at,
          project:contractor_projects(project_name)
        `)
        .eq("company_id", companyId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!tenantId,
  });
}

export function useContractorPortalStats(companyId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-portal-stats", companyId],
    queryFn: async () => {
      if (!companyId || !tenantId) return null;

      // Get projects count
      const { count: projectsCount } = await supabase
        .from("contractor_projects")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .is("deleted_at", null);

      // Get workers count by status
      const { data: workers } = await supabase
        .from("contractor_workers")
        .select("approval_status")
        .eq("company_id", companyId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      const approvedWorkers = workers?.filter(w => w.approval_status === "approved").length || 0;
      const pendingWorkers = workers?.filter(w => w.approval_status === "pending").length || 0;

      // Get pending gate passes
      const { count: pendingPasses } = await supabase
        .from("material_gate_passes")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("tenant_id", tenantId)
        .in("status", ["pending_pm", "pending_safety"])
        .is("deleted_at", null);

      // Get expiring inductions
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { count: expiringInductions } = await supabase
        .from("worker_inductions")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .lte("expires_at", thirtyDaysFromNow.toISOString())
        .gt("expires_at", new Date().toISOString())
        .is("deleted_at", null);

      return {
        activeProjects: projectsCount || 0,
        approvedWorkers,
        pendingWorkers,
        pendingGatePasses: pendingPasses || 0,
        expiringInductions: expiringInductions || 0,
      };
    },
    enabled: !!companyId && !!tenantId,
  });
}

export function useContractorPortalCreateWorker() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      company_id: string;
      full_name: string;
      full_name_ar?: string;
      national_id: string;
      nationality?: string;
      mobile_number: string;
      preferred_language?: string;
    }) => {
      if (!profile?.tenant_id) throw new Error("No tenant");

      const { data: result, error } = await supabase
        .from("contractor_workers")
        .insert({
          ...data,
          tenant_id: profile.tenant_id,
          approval_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-portal-workers"] });
      toast.success("Worker submitted for approval");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useContractorPortalRequestGatePass() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      company_id: string;
      project_id: string;
      pass_type: string;
      material_description: string;
      quantity?: number;
      vehicle_plate?: string;
      driver_name?: string;
      driver_mobile?: string;
      pass_date: string;
      time_window_start?: string;
      time_window_end?: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error("No tenant");

      // Generate reference number
      const refNumber = `GP-${Date.now().toString(36).toUpperCase()}`;
      
      const { data: result, error } = await supabase
        .from("material_gate_passes")
        .insert([{
          company_id: data.company_id,
          project_id: data.project_id,
          pass_type: data.pass_type,
          material_description: data.material_description,
          reference_number: refNumber,
          quantity: data.quantity?.toString(),
          vehicle_plate: data.vehicle_plate,
          driver_name: data.driver_name,
          driver_mobile: data.driver_mobile,
          pass_date: data.pass_date,
          time_window_start: data.time_window_start || null,
          time_window_end: data.time_window_end || null,
          tenant_id: profile.tenant_id,
          status: "pending_pm_approval",
          requested_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-portal-gate-passes"] });
      toast.success("Gate pass requested");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Combined hook for portal data - provides company, projects, workers in one query
export function useContractorPortalData() {
  const rep = useContractorRepresentative();
  const companyId = rep.data?.company?.id;
  const projects = useContractorPortalProjects(companyId);
  const workers = useContractorPortalWorkers(companyId);

  return {
    representative: rep.data,
    company: rep.data?.company,
    projects: projects.data,
    workers: workers.data,
    isLoading: rep.isLoading || projects.isLoading || workers.isLoading,
    isError: rep.isError || projects.isError || workers.isError,
  };
}

// Alias for gate passes hook
export const useContractorGatePasses = useContractorPortalGatePasses;

// Alias for create worker
export const useCreateContractorWorker = useContractorPortalCreateWorker;

// Alias for create gate pass
export const useCreateContractorGatePass = useContractorPortalRequestGatePass;
