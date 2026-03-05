import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, isPast, isToday, isThisWeek, parseISO } from 'date-fns';

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
    stage?: string;
}

export interface ObservationSummary {
    id: string;
    reference_number?: string;
    description?: string; // Observations might not have title, using description
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

            const now = new Date().toISOString();

            // 1. Fetch My Incidents (Assigned to me as investigator or I am reporter)
            // We need separate queries for different "My Incident" categories to be precise
            const fetchMyIncidents = async () => {
                // Assigned Investigations (I am investigator)
                const { data: assignedData } = await (supabase as any)
                    .from('incidents')
                    .select('id, reference_id, title, status, severity, created_at, stage')
                    .eq('tenant_id', tenantId)
                    .eq('lead_investigator_id', user.id)
                    .neq('status', 'closed')
                    .neq('status', 'cancelled'); // Assuming cancelled exists or just closed

                // Pending Reports (I reported, and it's draft or pending submission/info)
                const { data: reportedData } = await (supabase as any)
                    .from('incidents')
                    .select('id, reference_id, title, status, severity, created_at, stage')
                    .eq('tenant_id', tenantId)
                    .eq('reporter_id', user.id)
                    .in('status', ['draft', 'pending_more_info']);

                // Awaiting My Action (This is complex, lets assume it means assigned tasks OR specific states)
                // For now, let's map "Awaiting Action" to incidents where I am the assignee for the CURRENT stage
                // This logic is complex in SQL, skipping strict stage-assignee logic for now and defaulting to:
                // Incidents assigned to me that are not closed.
                const awaitingData = assignedData || [];

                return {
                    assigned: (assignedData || []) as IncidentSummary[],
                    pendingReport: (reportedData || []) as IncidentSummary[],
                    awaitingAction: (awaitingData) as IncidentSummary[], // Placeholder logic
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

                const allActions = (data || []) as ActionSummary[];

                const overdue = allActions.filter(a => a.due_date && isPast(parseISO(a.due_date)) && !isToday(parseISO(a.due_date)));
                const pendingVerification = allActions.filter(a => a.status === 'pending_verification');

                return {
                    assigned: allActions,
                    overdue,
                    pendingVerification
                };
            };

            // 3. Fetch My Observations
            const fetchMyObservations = async () => {
                // "Assigned" might mean I observed it, or I am assigned to fix it (if observations have assignees)
                // Usually observations are "Reported By Me".
                const { data: reported } = await (supabase as any)
                    .from('observations') // Assuming table name
                    .select('id, reference_number, description, status, created_at, observation_type')
                    .eq('tenant_id', tenantId)
                    .eq('created_by', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20);

                // Pending Closure
                const pendingClosure = (reported || []).filter((o: any) => o.status === 'pending_closure');

                // Recently Closed
                const recentlyClosed = (reported || []).filter((o: any) => o.status === 'closed').slice(0, 5);

                return {
                    assigned: (reported || []) as ObservationSummary[], // Using reported as assigned for now
                    pendingClosure: pendingClosure as ObservationSummary[],
                    recentlyClosed: recentlyClosed as ObservationSummary[]
                };
            };

            // 4. Fetch My Inspections (To add to tasks)
            const fetchMyInspections = async () => {
                const { data } = await supabase
                    .from('inspection_sessions')
                    .select('id, started_at, status, compliance_percentage')
                    .eq('tenant_id', tenantId)
                    .eq('inspector_id', user.id)
                    .in('status', ['draft', 'in_progress'])
                    .order('started_at', { ascending: true });

                return (data || []) as unknown[]; // Type loosely for now or define interface
            };

            // 5. Fetch My Approvals
            const fetchMyApprovals = async () => {
                const pendingItems: ApprovalItem[] = [];

                // A. Fetch User Roles for filtering
                const { data: rolesData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id);

                const userRoles = (rolesData || []).map(r => r.role) as string[];
                const isHsseManager = userRoles.includes('hsse_manager');
                const isHsseExpert = userRoles.includes('hsse_expert');
                const isAdmin = userRoles.includes('admin');
                const isManager = userRoles.includes('manager');

                // B. Incidents Pending Approval
                // 1. HSSE Manager Escalation & Pending Final Closure (HSSE Manager/Admin)
                if (isHsseManager || isAdmin) {
                    const { data: hsseIncidents } = await (supabase as any)
                        .from('incidents')
                        .select('id, reference_id, title, status, created_at, reporter:profiles(full_name)')
                        .eq('tenant_id', tenantId)
                        .in('status', ['hsse_manager_escalation', 'pending_final_closure', 'pending_investigation_plan_approval'])
                        .order('created_at', { ascending: true });

                    (hsseIncidents || []).forEach(i => {
                        pendingItems.push({
                            id: i.id,
                            type: 'incident',
                            title: i.title,
                            requestedBy: (i.reporter as any)?.full_name,
                            date: i.created_at,
                            status: i.status,
                            referenceId: i.reference_id
                        });
                    });
                }

                // 2. Pending Manager Approval (Manager/Admin)
                // Ideally check if user matches the reporter's department manager. 
                // Simplified: If user is "manager", show all "pending_manager_approval" (Refine if needed)
                if (isManager || isAdmin) { // This is broad, but better than nothing for now
                    const { data: managerIncidents } = await (supabase as any)
                        .from('incidents')
                        .select('id, reference_id, title, status, created_at, reporter:profiles(full_name)')
                        .eq('tenant_id', tenantId)
                        .eq('status', 'pending_manager_approval')
                        .order('created_at', { ascending: true });

                    (managerIncidents || []).forEach(i => {
                        pendingItems.push({
                            id: i.id,
                            type: 'incident',
                            title: i.title,
                            requestedBy: (i.reporter as any)?.full_name,
                            date: i.created_at,
                            status: i.status,
                            referenceId: i.reference_id
                        });
                    });
                }


                // C. Actions Pending Verification (HSSE/Env Expert/Manager/Admin)
                if (isHsseExpert || isHsseManager || isAdmin) {
                    const { data: pendingActions } = await supabase
                        .from('corrective_actions')
                        .select('id, title, status, due_date, completed_date, reference_id, assigned_user:profiles!corrective_actions_assigned_to_fkey(full_name)')
                        .eq('tenant_id', tenantId)
                        .eq('status', 'completed') // Completed means pending verification
                        .order('completed_date', { ascending: true });

                    (pendingActions || []).forEach(a => {
                        pendingItems.push({
                            id: a.id,
                            type: 'action',
                            title: a.title,
                            requestedBy: (a.assigned_user as any)?.full_name,
                            date: a.completed_date || a.due_date,
                            status: a.status,
                            referenceId: a.reference_id
                        });
                    });
                }

                return {
                    pending: pendingItems,
                    recentlyApproved: [], // Placeholder
                    recentlyRejected: []  // Placeholder
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
            // "My Tasks" = Actions + Assigned Investigations + Inspections
            const tasksList: TaskItem[] = [];

            // Add Actions
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

            // Add Incidents (Investigations)
            incidents.assigned.forEach(i => {
                tasksList.push({
                    id: i.id,
                    type: 'incident',
                    title: i.title,
                    status: i.status,
                    priority: i.severity, // Map severity to priority roughly
                    referenceId: i.reference_id
                });
            });

            // Add Inspections
            inspections.forEach((i: any) => {
                tasksList.push({
                    id: i.id,
                    type: 'inspection',
                    title: `Inspection #${i.id.substring(0, 8)}`, // Fallback title
                    status: i.status,
                    priority: 'medium',
                    referenceId: i.id
                });
            });
            // Calculate Task Stats
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
