import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MaterialGatePass } from "@/hooks/use-material-gate-passes";
import { GATE_PASS_SELECT } from "./constants";

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

            const pendingStatuses = [
                "pending_dept_approval",
                "pending_contractor_approval",
                "pending_club_mgmt_ack",
                "pending_security_approval",
                "pending_dept_ack",
                "pending_pm_approval",
                "pending_safety_approval",
            ];
            const pending = allPasses.filter(p => pendingStatuses.includes(p.status)).length;

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
