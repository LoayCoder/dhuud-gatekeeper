import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialGatePass, GatePassFilters } from "@/features/contractors/hooks/use-material-gate-passes";
import { GATE_PASS_SELECT } from "./constants";

/**
 * Fetch gate passes filtered by the department representative's assigned department.
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
            if (departmentId) {
                const { data: userDept } = await supabase
                    .from("departments")
                    .select("id, name")
                    .eq("id", departmentId)
                    .maybeSingle();

                const isGolfClubMgmt = userDept?.name?.toLowerCase().includes("golf club management");

                if (isGolfClubMgmt) {
                    const { data: clubMgmtPasses, error: clubMgmtError } = await supabase
                        .from("material_gate_passes")
                        .select(GATE_PASS_SELECT)
                        .eq("tenant_id", tenantId)
                        .eq("status", "pending_club_mgmt_ack")
                        .is("deleted_at", null)
                        .order("created_at", { ascending: false });

                    if (clubMgmtError) throw clubMgmtError;
                    if (clubMgmtPasses) allPending.push(...(clubMgmtPasses as MaterialGatePass[]));
                }
            }

            // 4. PUBLIC requests pending security approval
            const { data: userRoles } = await supabase
                .from("user_role_assignments")
                .select("roles(code)")
                .eq("user_id", userId)
                .eq("tenant_id", tenantId);

            const roleCodes = (userRoles || [])
                .map((r: { roles: { code: string } | null }) => r.roles?.code)
                .filter(Boolean) as string[];

            if (roleCodes.includes("security_supervisor") || roleCodes.includes("security_manager")) {
                const { data: securityPasses, error: secError } = await supabase
                    .from("material_gate_passes")
                    .select(GATE_PASS_SELECT)
                    .eq("tenant_id", tenantId)
                    .eq("status", "pending_security_approval")
                    .is("deleted_at", null)
                    .order("created_at", { ascending: false });

                if (secError) throw secError;
                if (securityPasses) allPending.push(...(securityPasses as MaterialGatePass[]));
            }

            // Deduplicate by ID
            const seenIds = new Set<string>();
            const deduped = allPending.filter(p => {
                if (seenIds.has(p.id)) return false;
                seenIds.add(p.id);
                return true;
            });

            deduped.sort((a, b) =>
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            );

            return deduped;
        },
        enabled: !!tenantId && !!userId,
    });
}
