import { supabase } from '../supabaseClient';
import type {
    MaterialGatePass,
    GatePassFilters,
} from '@/features/contractors/hooks/use-material-gate-passes';

export const getMaterialGatePasses = async (tenantId: string, filters: GatePassFilters = {}): Promise<MaterialGatePass[]> => {
    let query = supabase
        .from("material_gate_passes")
        .select(`
      id, reference_number, project_id, company_id, pass_type, material_description,
      quantity, vehicle_plate, driver_name, driver_mobile, pass_date, start_date, end_date,
      time_window_start, time_window_end, status, requested_by,
      pm_approved_by, pm_approved_at, pm_notes,
      safety_approved_by, safety_approved_at, safety_notes,
      rejected_by, rejected_at, rejection_reason,
      guard_verified_by, guard_verified_at, entry_time, exit_time, created_at,
      is_internal_request, approval_from_id,
      renewal_count, renewed_by, renewed_at, renewal_expires_at,
      project:contractor_projects(project_name, company:contractor_companies(company_name)),
      company:contractor_companies(company_name),
      requester:profiles!requested_by(full_name)
    `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.companyId) query = query.eq("company_id", filters.companyId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.passDate) query = query.eq("pass_date", filters.passDate);
    if (filters.search) {
        query = query.or(`reference_number.ilike.%${filters.search}%,material_description.ilike.%${filters.search}%,vehicle_plate.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as MaterialGatePass[];
};

export const getPendingGatePassApprovals = async (tenantId: string, userId: string): Promise<MaterialGatePass[]> => {
    const { data: userRoles } = await supabase
        .from("user_role_assignments")
        .select("roles(code)")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId);

    const roleCodes = (userRoles || [])
        .map((r: { roles: { code: string } | null }) => r.roles?.code)
        .filter(Boolean) as string[];

    const allowedStatuses: string[] = [];

    if (roleCodes.includes("security_supervisor") || roleCodes.includes("security_manager")) allowedStatuses.push("pending_security_approval");
    if (roleCodes.includes("contractor_consultant")) allowedStatuses.push("pending_contractor_approval");
    if (roleCodes.includes("department_representative") || roleCodes.includes("department_manager")) {
        allowedStatuses.push("pending_dept_approval", "pending_club_mgmt_ack", "pending_dept_ack");
    }
    if (roleCodes.includes("admin")) {
        allowedStatuses.push("pending_dept_approval", "pending_contractor_approval", "pending_club_mgmt_ack", "pending_security_approval", "pending_dept_ack", "pending_pm_approval", "pending_safety_approval");
    }

    if (allowedStatuses.length === 0) return [];

    const uniqueStatuses = [...new Set(allowedStatuses)];

    const { data: passes, error } = await supabase
        .from("material_gate_passes")
        .select(`
      id, reference_number, project_id, company_id, pass_type, material_description,
      quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
      time_window_start, time_window_end, status, requested_by, created_at,
      is_internal_request, approval_from_id,
      is_public_request, public_requester_name, public_requester_phone,
      public_requester_email, public_requester_company,
      project:contractor_projects(project_name, company:contractor_companies(company_name)),
      company:contractor_companies(company_name),
      requester:profiles!requested_by(full_name),
      approval_from:profiles!material_gate_passes_approval_from_id_fkey(full_name)
    `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .in("status", uniqueStatuses)
        .or(`requested_by.neq.${userId},requested_by.is.null`)
        .order("created_at", { ascending: false });

    if (error) throw error;

    const filteredPasses = (passes || []).filter((pass) => {
        const p = pass as unknown as MaterialGatePass;
        if (p.is_internal_request && p.status === "pending_dept_approval") {
            return p.approval_from_id === userId;
        }
        return true;
    });

    return filteredPasses as unknown as MaterialGatePass[];
};

export const getTodayApprovedPasses = async (tenantId: string): Promise<MaterialGatePass[]> => {
    const today = new Date().toISOString().split("T")[0];
    const activeStatuses = ["approved", "used", "completed"];

    const { data, error } = await supabase
        .from("material_gate_passes")
        .select(`
      id, reference_number, project_id, company_id, pass_type, material_description,
      quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
      time_window_start, time_window_end, status, guard_verified_by,
      guard_verified_at, entry_time, exit_time, created_at,
      project:contractor_projects(project_name, company:contractor_companies(company_name)),
      company:contractor_companies(company_name)
    `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .eq("pass_date", today)
        .in("status", activeStatuses)
        .order("time_window_start", { ascending: true });

    if (error) throw error;
    return (data || []) as MaterialGatePass[];
};
