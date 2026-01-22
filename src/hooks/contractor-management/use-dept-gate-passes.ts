import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialGatePass, GatePassFilters } from "./use-material-gate-passes";

/**
 * Fetch gate passes filtered by the department representative's assigned department.
 * This hook first retrieves projects belonging to the user's department,
 * then fetches gate passes for those projects.
 */
export function useDeptGatePasses(filters: GatePassFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const departmentId = profile?.assigned_department_id;

  return useQuery({
    queryKey: ["dept-gate-passes", tenantId, departmentId, filters],
    queryFn: async () => {
      if (!tenantId || !departmentId) return [];

      // First get projects in this department
      const { data: projects, error: projectsError } = await supabase
        .from("contractor_projects")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("department_id", departmentId)
        .is("deleted_at", null);

      if (projectsError) throw projectsError;

      const projectIds = projects?.map(p => p.id) || [];
      if (projectIds.length === 0) return [];

      // Then fetch gate passes for these projects
      let query = supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, project_id, company_id, pass_type, material_description,
          quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
          time_window_start, time_window_end, status, requested_by,
          pm_approved_by, pm_approved_at, pm_notes,
          safety_approved_by, safety_approved_at, safety_notes,
          rejected_by, rejected_at, rejection_reason,
          guard_verified_by, guard_verified_at, entry_time, exit_time, created_at,
          is_internal_request, approval_from_id,
          project:contractor_projects(project_name, department_id, company:contractor_companies(company_name)),
          company:contractor_companies(company_name),
          requester:profiles!requested_by(full_name)
        `)
        .eq("tenant_id", tenantId)
        .in("project_id", projectIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.passDate) {
        query = query.eq("pass_date", filters.passDate);
      }
      if (filters.search) {
        query = query.or(
          `reference_number.ilike.%${filters.search}%,material_description.ilike.%${filters.search}%,vehicle_plate.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MaterialGatePass[];
    },
    enabled: !!tenantId && !!departmentId,
  });
}

/**
 * Fetch gate passes pending approval for the department
 */
export function useDeptPendingApprovals() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const departmentId = profile?.assigned_department_id;

  return useQuery({
    queryKey: ["dept-pending-approvals", tenantId, departmentId],
    queryFn: async () => {
      if (!tenantId || !departmentId) return [];

      // First get projects in this department
      const { data: projects, error: projectsError } = await supabase
        .from("contractor_projects")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("department_id", departmentId)
        .is("deleted_at", null);

      if (projectsError) throw projectsError;

      const projectIds = projects?.map(p => p.id) || [];
      if (projectIds.length === 0) return [];

      const { data, error } = await supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, project_id, company_id, pass_type, material_description,
          quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
          time_window_start, time_window_end, status, requested_by,
          pm_approved_by, pm_approved_at, pm_notes,
          safety_approved_by, safety_approved_at, safety_notes,
          rejected_by, rejected_at, rejection_reason,
          guard_verified_by, guard_verified_at, entry_time, exit_time, created_at,
          is_internal_request, approval_from_id,
          project:contractor_projects(project_name, department_id, company:contractor_companies(company_name)),
          company:contractor_companies(company_name),
          requester:profiles!requested_by(full_name)
        `)
        .eq("tenant_id", tenantId)
        .in("project_id", projectIds)
        .in("status", ["pending", "pm_approved"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as MaterialGatePass[];
    },
    enabled: !!tenantId && !!departmentId,
  });
}

/**
 * Fetch today's approved gate passes for the department
 */
export function useDeptTodayPasses() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const departmentId = profile?.assigned_department_id;
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["dept-today-passes", tenantId, departmentId, today],
    queryFn: async () => {
      if (!tenantId || !departmentId) return [];

      // First get projects in this department
      const { data: projects, error: projectsError } = await supabase
        .from("contractor_projects")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("department_id", departmentId)
        .is("deleted_at", null);

      if (projectsError) throw projectsError;

      const projectIds = projects?.map(p => p.id) || [];
      if (projectIds.length === 0) return [];

      const { data, error } = await supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, project_id, company_id, pass_type, material_description,
          quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
          time_window_start, time_window_end, status, requested_by,
          pm_approved_by, pm_approved_at, pm_notes,
          safety_approved_by, safety_approved_at, safety_notes,
          rejected_by, rejected_at, rejection_reason,
          guard_verified_by, guard_verified_at, entry_time, exit_time, created_at,
          is_internal_request, approval_from_id,
          project:contractor_projects(project_name, department_id, company:contractor_companies(company_name)),
          company:contractor_companies(company_name),
          requester:profiles!requested_by(full_name)
        `)
        .eq("tenant_id", tenantId)
        .in("project_id", projectIds)
        .eq("pass_date", today)
        .in("status", ["approved", "entry_verified", "completed"])
        .is("deleted_at", null)
        .order("time_window_start", { ascending: true });

      if (error) throw error;
      return (data || []) as MaterialGatePass[];
    },
    enabled: !!tenantId && !!departmentId,
  });
}

/**
 * Get gate pass statistics for the department
 */
export function useDeptGatePassStats() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const departmentId = profile?.assigned_department_id;
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["dept-gate-pass-stats", tenantId, departmentId, today],
    queryFn: async () => {
      if (!tenantId || !departmentId) {
        return { total: 0, pending: 0, approvedToday: 0, completedThisWeek: 0 };
      }

      // Get projects in this department
      const { data: projects } = await supabase
        .from("contractor_projects")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("department_id", departmentId)
        .is("deleted_at", null);

      const projectIds = projects?.map(p => p.id) || [];
      if (projectIds.length === 0) {
        return { total: 0, pending: 0, approvedToday: 0, completedThisWeek: 0 };
      }

      // Calculate week start
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = weekStart.toISOString().split("T")[0];

      // Get all passes for stats
      const { data: allPasses } = await supabase
        .from("material_gate_passes")
        .select("id, status, pass_date, created_at")
        .eq("tenant_id", tenantId)
        .in("project_id", projectIds)
        .is("deleted_at", null);

      const passes = allPasses || [];
      
      const total = passes.length;
      const pending = passes.filter(p => p.status === "pending" || p.status === "pm_approved").length;
      const approvedToday = passes.filter(p => 
        p.pass_date === today && 
        (p.status === "approved" || p.status === "entry_verified" || p.status === "completed")
      ).length;
      const completedThisWeek = passes.filter(p => 
        p.status === "completed" && 
        p.pass_date >= weekStartStr
      ).length;

      return { total, pending, approvedToday, completedThisWeek };
    },
    enabled: !!tenantId && !!departmentId,
  });
}
