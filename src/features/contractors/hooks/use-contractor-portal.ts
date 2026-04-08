import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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

export interface ContractorPortalProject {
  id: string;
  project_code: string;
  project_name: string;
  project_name_ar: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  assigned_workers_count: number;
  required_safety_officers: number | null;
  location_description: string | null;
  project_manager_id: string | null;
  company_id: string;
  notes: string | null;
  geofence_radius_meters: number | null;
  site: { name: string } | null;
  branch: { name: string } | null;
  department: { name: string } | null;
  project_manager: { full_name: string } | null;
}

export function useContractorPortalProjects(companyId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-portal-projects", companyId],
    queryFn: async (): Promise<ContractorPortalProject[]> => {
      if (!companyId || !tenantId) return [];

      const { data, error } = await supabase
        .from("contractor_projects")
        .select(`
          id, project_code, project_name, project_name_ar, status, start_date,
          end_date, assigned_workers_count, required_safety_officers, location_description,
          project_manager_id, company_id, notes, geofence_radius_meters,
          site:sites(name), branch:branches(name), department:departments(name),
          project_manager:profiles!contractor_projects_project_manager_id_fkey(full_name)
        `)
        .eq("company_id", companyId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("start_date", { ascending: false });

      if (error) throw error;
      
      return (data || []) as unknown as ContractorPortalProject[];
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
          id, tenant_id, company_id, full_name, full_name_ar, id_type, national_id,
          date_of_birth, gender, nationality, mobile_number, email,
          emergency_contact_name, emergency_contact_phone,
          worker_role, worker_type, preferred_language, approval_status, approved_at,
          approved_by, rejection_reason, created_at, photo_path,
          safety_officer_id,
          security_approval_status, security_approved_by, security_approved_at, security_rejection_reason,
          photo_verified_by, photo_verified_at,
          fitness_to_work, fitness_acknowledged, medical_check_date,
          fitness_expiry_date, medical_certificate_path, training_certifications,
          edit_pending_approval, edited_by, edited_at,
          induction_status,
          company:contractor_companies(company_name),
          latest_induction:worker_inductions(id, status, expires_at)
        `)
        .eq("company_id", companyId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Normalize latest_induction from array to single object (PostgREST returns array for non-unique FK)
      return (data || []).map((w: any) => ({
        ...w,
        latest_induction: Array.isArray(w.latest_induction) ? w.latest_induction[0] || null : w.latest_induction,
      }));
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
          material_description, vehicle_plate, driver_name,
          driver_mobile, pass_date, start_date, end_date,
          time_window_start, time_window_end, status,
          requested_by, is_internal_request,
          pm_approved_by, pm_approved_at, pm_notes,
          safety_approved_by, safety_approved_at, safety_notes,
          rejected_by, rejected_at, rejection_reason,
          guard_verified_by, guard_verified_at,
          entry_time, exit_time, created_at,
          project_id, company_id, approval_from_id,
          is_public_request,
          project:contractor_projects(project_name, company:contractor_companies(company_name)),
          company:contractor_companies(company_name),
          approval_from:profiles!material_gate_passes_approval_from_id_fkey(full_name),
          requester:profiles!material_gate_passes_requested_by_fkey(full_name)
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
        .in("status", ["pending_dept_approval", "pending_contractor_approval", "pending_acknowledgment", "pending_security_approval"])
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
  const { t } = useTranslation();
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
      id_type?: string;
      date_of_birth?: string | null;
      gender?: string | null;
      email?: string | null;
      emergency_contact_name?: string | null;
      emergency_contact_phone?: string | null;
      worker_role?: string;
      fitness_to_work?: string | null;
      fitness_acknowledged?: boolean;
      medical_check_date?: string | null;
      fitness_expiry_date?: string | null;
      medical_certificate_path?: string | null;
      training_certifications?: string[];
      photo_path?: string | null;
      project_id?: string;
      expiry_date?: string | null;
      user_type?: string;
      access_start_date?: string | null;
      access_end_date?: string | null;
    }) => {
      if (!profile?.tenant_id) throw new Error("No tenant");

      const { project_id, ...insertData } = data;

      const { data: result, error } = await supabase
        .from("contractor_workers")
        .insert({
          ...insertData,
          project_id: project_id || null,
          expiry_date: data.expiry_date || null,
          tenant_id: profile.tenant_id,
          approval_status: "pending",
        } as any)
        .select()
        .single()
        .throwOnError();

      if (error) throw error;

      // Auto-create project_worker_assignments link
      if (project_id && result) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from("project_worker_assignments")
          .insert({
            project_id,
            worker_id: result.id,
            tenant_id: profile.tenant_id,
            created_by: user?.id || profile.id,
            is_active: true,
          })
          .throwOnError();
      }

      // Auto-create PTW access request if worker has PTW certification
      if (data.training_certifications?.includes("ptw") && result) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from("ptw_access_requests")
          .insert({
            tenant_id: profile.tenant_id,
            worker_id: result.id,
            company_id: data.company_id,
            requested_by: user?.id || profile.id,
            status: "pending",
          })
          .throwOnError();

        await supabase
          .from("contractor_workers")
          .update({
            ptw_access_status: "pending",
            ptw_access_requested_at: new Date().toISOString(),
          } as any)
          .eq("id", result.id)
          .throwOnError();
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-portal-workers"] });
      toast.success(t("contractors.messages.workerSubmitted", "Worker submitted for approval"));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Combined hook for portal data - provides company, projects, workers in one query
export function useContractorPortalData() {
  const { profile, isAdmin } = useAuth();
  const rep = useContractorRepresentative();
  
  // For admins without a rep record, fetch first company as fallback
  const adminFallbackCompany = useQuery({
    queryKey: ["contractor-portal-admin-fallback-company", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      // Pick a company that has workers/projects for a meaningful admin preview
      const { data: companies, error } = await supabase
        .from("contractor_companies")
        .select("id, company_name, company_name_ar, status, email, phone")
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .order("company_name");
      if (error) throw error;
      if (!companies || companies.length === 0) return null;

      // Try to find a company with workers
      for (const co of companies) {
        const { count } = await supabase
          .from("contractor_workers")
          .select("id", { count: "exact", head: true })
          .eq("company_id", co.id)
          .is("deleted_at", null);
        if (count && count > 0) return co;
      }
      // Fallback to first company
      return companies[0];
    },
    enabled: !!isAdmin && !rep.data && !rep.isLoading && !!profile?.tenant_id,
  });

  const company = rep.data?.company || (isAdmin ? adminFallbackCompany.data : null);
  const companyId = company?.id;

  const projects = useContractorPortalProjects(companyId);
  const workers = useContractorPortalWorkers(companyId);

  return {
    representative: rep.data,
    company,
    projects: projects.data,
    workers: workers.data,
    isLoading: rep.isLoading || projects.isLoading || workers.isLoading || (isAdmin && adminFallbackCompany.isLoading),
    isError: rep.isError || projects.isError || workers.isError,
  };
}

// Alias for gate passes hook
export const useContractorGatePasses = useContractorPortalGatePasses;

// Alias for create worker
export const useCreateContractorWorker = useContractorPortalCreateWorker;
