import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialGatePass, GatePassFilters } from "./use-material-gate-passes";

const GATE_PASS_SELECT = `
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
  requester:profiles!requested_by(full_name),
  approval_from:profiles!approval_from_id(full_name)
`;

/**
 * Fetch gate passes filtered by the department representative's assigned department.
 * Handles BOTH routing methods:
 * - Internal requests: Route via approval_from_id (assigned to this user)
 * - External requests: Route via project.department_id
 */
export function useDeptGatePasses(filters: GatePassFilters = {}) {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const departmentId = profile?.assigned_department_id;
  const userId = user?.id;

  return useQuery({
    queryKey: ["dept-gate-passes", tenantId, departmentId, userId, filters],
    queryFn: async () => {
      if (!tenantId || !userId) return [];

      const allPasses: MaterialGatePass[] = [];

      // 1. INTERNAL requests: where approval_from_id = current user
      const { data: internalPasses, error: internalError } = await supabase
        .from("material_gate_passes")
        .select(GATE_PASS_SELECT)
        .eq("tenant_id", tenantId)
        .eq("approval_from_id", userId)
        .eq("is_internal_request", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (internalError) throw internalError;
      if (internalPasses) allPasses.push(...(internalPasses as MaterialGatePass[]));

      // 2. EXTERNAL requests: where project belongs to user's department
      if (departmentId) {
        const { data: projects, error: projectsError } = await supabase
          .from("contractor_projects")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("department_id", departmentId)
          .is("deleted_at", null);

        if (projectsError) throw projectsError;

        const projectIds = projects?.map(p => p.id) || [];
        if (projectIds.length > 0) {
          const { data: externalPasses, error: externalError } = await supabase
            .from("material_gate_passes")
            .select(GATE_PASS_SELECT)
            .eq("tenant_id", tenantId)
            .in("project_id", projectIds)
            .eq("is_internal_request", false)
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

          if (externalError) throw externalError;
          if (externalPasses) allPasses.push(...(externalPasses as MaterialGatePass[]));
        }
      }

      // Apply filters on combined results
      let filtered = allPasses;

      if (filters.status) {
        filtered = filtered.filter(p => p.status === filters.status);
      }
      if (filters.passDate) {
        filtered = filtered.filter(p => p.pass_date === filters.passDate);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(p =>
          p.reference_number?.toLowerCase().includes(searchLower) ||
          p.material_description?.toLowerCase().includes(searchLower) ||
          p.vehicle_plate?.toLowerCase().includes(searchLower)
        );
      }

      // Sort by created_at descending
      filtered.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      return filtered;
    },
    enabled: !!tenantId && !!userId,
  });
}

/**
 * Fetch gate passes pending approval for the department representative.
 * Handles BOTH routing methods:
 * - Internal requests: status = pending_dept_approval AND approval_from_id = current user
 * - External requests: status in [pending_contractor_approval, pending_club_mgmt_ack] AND project in user's department
 */
export function useDeptPendingApprovals() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const departmentId = profile?.assigned_department_id;
  const userId = user?.id;

  return useQuery({
    queryKey: ["dept-pending-approvals", tenantId, departmentId, userId],
    queryFn: async () => {
      if (!tenantId || !userId) return [];

      const allPending: MaterialGatePass[] = [];

      // 1. INTERNAL requests assigned to this user with pending_dept_approval status
      const { data: internalPasses, error: internalError } = await supabase
        .from("material_gate_passes")
        .select(GATE_PASS_SELECT)
        .eq("tenant_id", tenantId)
        .eq("approval_from_id", userId)
        .eq("is_internal_request", true)
        .eq("status", "pending_dept_approval")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (internalError) throw internalError;
      if (internalPasses) allPending.push(...(internalPasses as MaterialGatePass[]));

      // 2. EXTERNAL requests for department projects with pending statuses
      if (departmentId) {
        const { data: projects, error: projectsError } = await supabase
          .from("contractor_projects")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("department_id", departmentId)
          .is("deleted_at", null);

        if (projectsError) throw projectsError;

        const projectIds = projects?.map(p => p.id) || [];
        if (projectIds.length > 0) {
          const { data: externalPasses, error: externalError } = await supabase
            .from("material_gate_passes")
            .select(GATE_PASS_SELECT)
            .eq("tenant_id", tenantId)
            .in("project_id", projectIds)
            .eq("is_internal_request", false)
            .in("status", ["pending_contractor_approval", "pending_club_mgmt_ack"])
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

          if (externalError) throw externalError;
          if (externalPasses) allPending.push(...(externalPasses as MaterialGatePass[]));
        }
      }

      // 3. INTERNAL requests pending Golf Club Management acknowledgment
      // Check if current user is in Golf Club Management department
      if (departmentId) {
        // First get the user's department name
        const { data: userDept } = await supabase
          .from("departments")
          .select("id, name")
          .eq("id", departmentId)
          .maybeSingle();

        // Check if user is in Golf Club Management department
        const isGolfClubMgmt = userDept?.name?.toLowerCase().includes("golf club management");

        if (isGolfClubMgmt) {
          // User is in Golf Club Management - fetch all internal pending_club_mgmt_ack
          const { data: clubMgmtPasses, error: clubMgmtError } = await supabase
            .from("material_gate_passes")
            .select(GATE_PASS_SELECT)
            .eq("tenant_id", tenantId)
            .eq("is_internal_request", true)
            .eq("status", "pending_club_mgmt_ack")
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

          if (clubMgmtError) throw clubMgmtError;
          if (clubMgmtPasses) allPending.push(...(clubMgmtPasses as MaterialGatePass[]));
        }
      }

      // Sort by created_at descending
      allPending.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      return allPending;
    },
    enabled: !!tenantId && !!userId,
  });
}

/**
 * Fetch today's approved gate passes for the department
 */
export function useDeptTodayPasses() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const departmentId = profile?.assigned_department_id;
  const userId = user?.id;
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["dept-today-passes", tenantId, departmentId, userId, today],
    queryFn: async () => {
      if (!tenantId || !userId) return [];

      const allPasses: MaterialGatePass[] = [];

      // Active pass statuses: approved (ready), used (entry recorded), completed (both entry/exit)
      const activeStatuses = ["approved", "used", "completed"];

      // 1. INTERNAL requests approved and scheduled for today
      const { data: internalPasses, error: internalError } = await supabase
        .from("material_gate_passes")
        .select(GATE_PASS_SELECT)
        .eq("tenant_id", tenantId)
        .eq("approval_from_id", userId)
        .eq("is_internal_request", true)
        .eq("pass_date", today)
        .in("status", activeStatuses)
        .is("deleted_at", null)
        .order("time_window_start", { ascending: true });

      if (internalError) throw internalError;
      if (internalPasses) allPasses.push(...(internalPasses as MaterialGatePass[]));

      // 2. EXTERNAL requests for department projects
      if (departmentId) {
        const { data: projects, error: projectsError } = await supabase
          .from("contractor_projects")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("department_id", departmentId)
          .is("deleted_at", null);

        if (projectsError) throw projectsError;

        const projectIds = projects?.map(p => p.id) || [];
        if (projectIds.length > 0) {
          const { data: externalPasses, error: externalError } = await supabase
            .from("material_gate_passes")
            .select(GATE_PASS_SELECT)
            .eq("tenant_id", tenantId)
            .in("project_id", projectIds)
            .eq("is_internal_request", false)
            .eq("pass_date", today)
            .in("status", activeStatuses)
            .is("deleted_at", null)
            .order("time_window_start", { ascending: true });

          if (externalError) throw externalError;
          if (externalPasses) allPasses.push(...(externalPasses as MaterialGatePass[]));
        }
      }

      // Sort by time_window_start
      allPasses.sort((a, b) => {
        const timeA = a.time_window_start || "00:00";
        const timeB = b.time_window_start || "00:00";
        return timeA.localeCompare(timeB);
      });

      return allPasses;
    },
    enabled: !!tenantId && !!userId,
  });
}

/**
 * Get gate pass statistics for the department
 */
export function useDeptGatePassStats() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const departmentId = profile?.assigned_department_id;
  const userId = user?.id;
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["dept-gate-pass-stats", tenantId, departmentId, userId, today],
    queryFn: async () => {
      if (!tenantId || !userId) {
        return { total: 0, pending: 0, approvedToday: 0, completedThisWeek: 0 };
      }

      const allPasses: { status: string; pass_date: string | null }[] = [];

      // Calculate week start
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = weekStart.toISOString().split("T")[0];

      // 1. INTERNAL requests assigned to this user
      const { data: internalPasses } = await supabase
        .from("material_gate_passes")
        .select("id, status, pass_date")
        .eq("tenant_id", tenantId)
        .eq("approval_from_id", userId)
        .eq("is_internal_request", true)
        .is("deleted_at", null);

      if (internalPasses) allPasses.push(...internalPasses);

      // 2. EXTERNAL requests for department projects
      if (departmentId) {
        const { data: projects } = await supabase
          .from("contractor_projects")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("department_id", departmentId)
          .is("deleted_at", null);

        const projectIds = projects?.map(p => p.id) || [];
        if (projectIds.length > 0) {
          const { data: externalPasses } = await supabase
            .from("material_gate_passes")
            .select("id, status, pass_date")
            .eq("tenant_id", tenantId)
            .in("project_id", projectIds)
            .eq("is_internal_request", false)
            .is("deleted_at", null);

          if (externalPasses) allPasses.push(...externalPasses);
        }
      }

      // Calculate stats
      const total = allPasses.length;

      // Pending includes all approval stages in the current workflow
      const pendingStatuses = [
        "pending_dept_approval",        // Internal: Dept Rep approval
        "pending_contractor_approval",  // External: Contractor Consultant approval
        "pending_club_mgmt_ack",        // Both: Golf Club Management acknowledgment
        "pending_security_approval",    // Both: Security Supervisor approval
        // Legacy statuses (for backward compatibility)
        "pending_dept_ack",
        "pending_pm_approval",
        "pending_safety_approval",
      ];
      const pending = allPasses.filter(p => pendingStatuses.includes(p.status)).length;

      // Active passes scheduled for today (approved, used, or completed)
      const approvedToday = allPasses.filter(p =>
        p.pass_date === today &&
        (p.status === "approved" || p.status === "used" || p.status === "completed")
      ).length;
      
      const completedThisWeek = allPasses.filter(p => 
        p.status === "completed" && 
        p.pass_date && p.pass_date >= weekStartStr
      ).length;

      return { total, pending, approvedToday, completedThisWeek };
    },
    enabled: !!tenantId && !!userId,
  });
}
