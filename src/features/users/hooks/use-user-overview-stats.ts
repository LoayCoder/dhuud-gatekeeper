import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isPast, isToday, isThisWeek, parseISO } from 'date-fns';

// ── Joined relation interfaces ──────────────────────────────
interface ProfileSummary {
    full_name: string | null;
}

interface IncidentRow {
    id: string;
    reference_id: string;
    title: string;
    status: string;
    severity: string;
    created_at: string;
}

interface IncidentWithReporter extends IncidentRow {
    reporter: ProfileSummary | null;
}

interface ActionWithAssignee {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
    completed_date: string | null;
    reference_id: string | null;
    assigned_user: ProfileSummary | null;
}

interface ObservationRow {
    id: string;
    reference_number: string | null;
    description: string | null;
    status: string;
    created_at: string;
    observation_type: string | null;
}

interface InspectionSessionRow {
    id: string;
    started_at: string | null;
    status: string | null;
    compliance_percentage: number | null;
}



// ── Exported interfaces ─────────────────────────────────────
export interface UserOverviewStats {
    tasks: {
        total: number;
        overdue: number;
        dueToday: number;
        dueThisWeek: number;
        items: TaskItem[];
    };
    incidents: {
        assigned: IncidentSummary[];
        pendingReport: IncidentSummary[];
        awaitingAction: IncidentSummary[];
    };
    observations: {
        assigned: ObservationSummary[];
        pendingClosure: ObservationSummary[];
        recentlyClosed: ObservationSummary[];
    };
    actions: {
        assigned: ActionSummary[];
        overdue: ActionSummary[];
        pendingVerification: ActionSummary[];
    };
    approvals: {
        pending: ApprovalItem[];
        recentlyApproved: ApprovalItem[];
        recentlyRejected: ApprovalItem[];
    };
}

export interface TaskItem {
    id: string;
    type: 'incident' | 'action' | 'inspection' | 'approval';
    title: string;
    dueDate?: string;
    status: string;
    priority?: string;
    referenceId?: string;
}

export interface IncidentSummary {
    id: string;
    reference_id: string;
    title: string;
    status: string;
    severity: string;
    created_at: string;
}

export interface ObservationSummary {
    id: string;
    reference_number?: string;
    description?: string;
    status: string;
    created_at: string;
    observation_type?: string;
}

export interface ActionSummary {
    id: string;
    title: string;
    status: string;
    due_date: string;
    priority: string;
    reference_id?: string;
}

export interface ApprovalItem {
    id: string;
    type: 'incident' | 'action' | 'gate_pass' | 'permit';
    title: string;
    requestedBy?: string;
    date: string;
    status: string;
    referenceId?: string;
}

export function useUserOverviewStats() {
    const { user, profile } = useAuth();
    const tenantId = profile?.tenant_id;

    return useQuery({
        queryKey: ['user-overview-stats', tenantId, user?.id],
        queryFn: async (): Promise<UserOverviewStats> => {
            if (!tenantId || !user?.id) throw new Error('User not authenticated');

            // 1. Fetch My Incidents
            const fetchMyIncidents = async () => {
                // Fetch incidents where user is reporter and status requires attention
                const { data: reportedData } = await supabase.from('incidents')
                    .select('id, reference_id, title, status, severity, created_at')
                    .eq('tenant_id', tenantId)
                    .eq('reporter_id', user.id)
                    .in('status', ['submitted', 'returned_to_reporter']);

                // Fetch incidents where user is the investigator via investigations table
                const { data: investigationsData } = await supabase.from('investigations')
                    .select('incident_id')
                    .eq('tenant_id', tenantId)
                    .eq('investigator_id', user.id);

                let assigned: IncidentSummary[] = [];
                if (investigationsData && investigationsData.length > 0) {
                    const incidentIds = investigationsData.map(inv => inv.incident_id).filter(Boolean) as string[];
                    if (incidentIds.length > 0) {
                        const { data: assignedData } = await supabase.from('incidents')
                            .select('id, reference_id, title, status, severity, created_at')
                            .eq('tenant_id', tenantId)
                            .in('id', incidentIds)
                            .neq('status', 'closed');
                        assigned = (assignedData ?? []) as IncidentSummary[];
                    }
                }

                const pendingReport = (reportedData ?? []) as IncidentSummary[];

                return {
                    assigned,
                    pendingReport,
                    awaitingAction: assigned,
                };
            };

            // 2. Fetch My Corrective Actions
            const fetchMyActions = async () => {
                const { data } = await supabase
                    .from('corrective_actions')
                    .select('id, title, status, due_date, priority, reference_id')
                    .eq('tenant_id', tenantId)
                    .eq('assigned_to', user.id)
                    .neq('status', 'closed')
                    .neq('status', 'verified');

                const allActions = (data ?? []) as ActionSummary[];

                const overdue = allActions.filter(a => a.due_date && isPast(parseISO(a.due_date)) && !isToday(parseISO(a.due_date)));
                const pendingVerification = allActions.filter(a => a.status === 'pending_verification');

                return {
                    assigned: allActions,
                    overdue,
                    pendingVerification
                };
            };

            // 3. Fetch My Observations
            // The 'observations' table does not exist yet — return empty data gracefully
            const fetchMyObservations = async (): Promise<{ assigned: ObservationSummary[]; pendingClosure: ObservationSummary[]; recentlyClosed: ObservationSummary[] }> => {
                return {
                    assigned: [],
                    pendingClosure: [],
                    recentlyClosed: [],
                };
            };

            // 4. Fetch My Inspections
            const fetchMyInspections = async () => {
                const { data } = await supabase
                    .from('inspection_sessions')
                    .select('id, started_at, status, compliance_percentage')
                    .eq('tenant_id', tenantId)
                    .eq('inspector_id', user.id)
                    .in('status', ['draft', 'in_progress'])
                    .order('started_at', { ascending: true });

                return (data ?? []) as InspectionSessionRow[];
            };

            // 5. Fetch My Approvals
            const fetchMyApprovals = async () => {
                const pendingItems: ApprovalItem[] = [];

                const { data: rolesData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id);

                const userRoles = (rolesData ?? []).map(r => r.role) as string[];
                const isHsseManager = userRoles.includes('hsse_manager');
                const isHsseExpert = userRoles.includes('hsse_expert');
                const isAdmin = userRoles.includes('admin');
                const isManager = userRoles.includes('manager');

                // HSSE Manager Escalation & Pending Final Closure
                if (isHsseManager || isAdmin) {
                    const { data: hsseIncidents } = await supabase.from('incidents')
                        .select('id, reference_id, title, status, created_at, reporter:profiles!incidents_reporter_id_fkey(full_name)')
                        .eq('tenant_id', tenantId)
                        .in('status', ['hsse_manager_escalation', 'pending_final_closure', 'pending_closure'])
                        .order('created_at', { ascending: true });

                    const typedHsseIncidents = (hsseIncidents ?? []) as unknown as IncidentWithReporter[];
                    typedHsseIncidents.forEach((i) => {
                        pendingItems.push({
                            id: i.id,
                            type: 'incident',
                            title: i.title,
                            requestedBy: i.reporter?.full_name ?? undefined,
                            date: i.created_at,
                            status: i.status,
                            referenceId: i.reference_id
                        });
                    });
                }

                // Pending Manager Approval
                if (isManager || isAdmin) {
                    const { data: managerIncidents } = await supabase.from('incidents')
                        .select('id, reference_id, title, status, created_at, reporter:profiles!incidents_reporter_id_fkey(full_name)')
                        .eq('tenant_id', tenantId)
                        .eq('status', 'pending_manager_approval')
                        .order('created_at', { ascending: true });

                    const typedManagerIncidents = (managerIncidents ?? []) as unknown as IncidentWithReporter[];
                    typedManagerIncidents.forEach((i) => {
                        pendingItems.push({
                            id: i.id,
                            type: 'incident',
                            title: i.title,
                            requestedBy: i.reporter?.full_name ?? undefined,
                            date: i.created_at,
                            status: i.status,
                            referenceId: i.reference_id
                        });
                    });
                }

                // Actions Pending Verification
                if (isHsseExpert || isHsseManager || isAdmin) {
                    const { data: pendingActions } = await supabase
                        .from('corrective_actions')
                        .select('id, title, status, due_date, completed_date, reference_id, assigned_user:profiles!corrective_actions_assigned_to_fkey(full_name)')
                        .eq('tenant_id', tenantId)
                        .eq('status', 'completed')
                        .order('completed_date', { ascending: true });

                    const typedActions = (pendingActions ?? []) as unknown as ActionWithAssignee[];
                    typedActions.forEach((a) => {
                        pendingItems.push({
                            id: a.id,
                            type: 'action',
                            title: a.title,
                            requestedBy: a.assigned_user?.full_name ?? undefined,
                            date: a.completed_date || a.due_date || '',
                            status: a.status,
                            referenceId: a.reference_id ?? undefined
                        });
                    });
                }

                return {
                    pending: pendingItems,
                    recentlyApproved: [],
                    recentlyRejected: []
                };
            };

            // Execute fetches
            const [incidents, actions, observations, inspections, approvals] = await Promise.all([
                fetchMyIncidents(),
                fetchMyActions(),
                fetchMyObservations(),
                fetchMyInspections(),
                fetchMyApprovals()
            ]);

            // 6. Aggregate Tasks
            const tasksList: TaskItem[] = [];

            actions.assigned.forEach(a => {
                tasksList.push({
                    id: a.id,
                    type: 'action',
                    title: a.title,
                    dueDate: a.due_date,
                    status: a.status,
                    priority: a.priority,
                    referenceId: a.reference_id
                });
            });

            incidents.assigned.forEach(i => {
                tasksList.push({
                    id: i.id,
                    type: 'incident',
                    title: i.title,
                    status: i.status,
                    priority: i.severity,
                    referenceId: i.reference_id
                });
            });

            inspections.forEach((i) => {
                tasksList.push({
                    id: i.id,
                    type: 'inspection',
                    title: `Inspection #${i.id.substring(0, 8)}`,
                    status: i.status ?? 'unknown',
                    priority: 'medium',
                    referenceId: i.id
                });
            });

            const totalTasks = tasksList.length;
            const overdueTasks = tasksList.filter(t => t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))).length;
            const dueTodayTasks = tasksList.filter(t => t.dueDate && isToday(parseISO(t.dueDate))).length;
            const dueThisWeekTasks = tasksList.filter(t => t.dueDate && isThisWeek(parseISO(t.dueDate))).length;

            return {
                tasks: {
                    total: totalTasks,
                    overdue: overdueTasks,
                    dueToday: dueTodayTasks,
                    dueThisWeek: dueThisWeekTasks,
                    items: tasksList
                },
                incidents,
                observations,
                actions,
                approvals
            };
        },
        enabled: !!tenantId && !!user?.id,
        refetchInterval: 60000
    });
}