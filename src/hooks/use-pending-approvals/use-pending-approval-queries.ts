import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/features/users';
import { logger } from '@/lib/logger';
import type { PendingActionApproval, PendingSeverityApproval, PendingPotentialSeverityApproval, PendingIncidentApproval } from './types';

// Fetch actions with status='completed' pending verification
// Only HSSE Expert, HSSE Manager, Environmental Expert, Environmental Manager can verify
export function usePendingActionApprovals() {
    const { profile, user } = useAuth();
    const { hasRole } = useUserRoles();

    // Define which roles can verify actions per permission matrix
    const isAdmin = hasRole('admin');
    const isHSSEExpert = hasRole('hsse_expert');
    const isHSSEManager = hasRole('hsse_manager');
    const isEnvironmentalExpert = hasRole('environmental_expert');
    const isEnvironmentalManager = hasRole('environmental_manager');

    // Only these specific roles can verify corrective actions
    const canVerifyActions = isAdmin || isHSSEExpert || isHSSEManager ||
        isEnvironmentalExpert || isEnvironmentalManager;

    return useQuery({
        queryKey: ['pending-action-approvals', profile?.tenant_id, user?.id, canVerifyActions],
        queryFn: async () => {
            if (!profile?.tenant_id || !user?.id) return [];

            // If user doesn't have verification permissions, return empty
            if (!canVerifyActions) return [];

            // Build query for completed actions
            const query = supabase
                .from('corrective_actions')
                .select(`
          id, reference_id, title, description, status, priority, category, 
          due_date, completed_date, incident_id, assigned_to,
          responsible_department_id, created_at,
          linked_cause_type, linked_root_cause_id, completion_notes,
          assigned_user:profiles!corrective_actions_assigned_to_fkey(id, full_name),
          department:departments!corrective_actions_responsible_department_id_fkey(id, name),
          incident:incidents!corrective_actions_incident_id_fkey(id, reference_id, title, event_type)
        `)
                .eq('tenant_id', profile.tenant_id)
                .eq('status', 'completed')
                .is('deleted_at', null)
                .order('completed_date', { ascending: true });

            const { data, error } = await query;
            if (error) throw error;

            let actions = (data || []) as (PendingActionApproval & { incident?: { event_type?: string } })[];

            // Environmental roles can only verify environment-related actions
            if ((isEnvironmentalExpert || isEnvironmentalManager) && !isAdmin && !isHSSEExpert && !isHSSEManager) {
                actions = actions.filter(action =>
                    action.category === 'environmental' ||
                    action.incident?.event_type === 'environmental'
                );
            }

            return actions as PendingActionApproval[];
        },
        enabled: !!profile?.tenant_id && !!user?.id,
    });
}

// Fetch incidents with pending severity changes (HSSE Manager/Admin only)
export function usePendingSeverityApprovals() {
    const { profile, user } = useAuth();
    const { hasRole, isLoading: rolesLoading } = useUserRoles();

    const isAdmin = hasRole('admin');
    const isHSSEManager = hasRole('hsse_manager');
    const canApprove = isAdmin || isHSSEManager;

    return useQuery({
        queryKey: ['pending-severity-approvals', profile?.tenant_id, canApprove],
        queryFn: async () => {
            if (!profile?.tenant_id || !user?.id) return [];

            // Only admin or HSSE manager can approve severity changes
            if (!canApprove) return [];

            const { data, error } = await supabase
                .from('incidents')
                .select(`
          id, reference_id, title, severity_v2, original_severity_v2,
          severity_change_justification, severity_pending_approval, created_at,
          reporter:profiles!incidents_reporter_id_fkey(id, full_name)
        `)
                .eq('tenant_id', profile.tenant_id)
                .eq('severity_pending_approval', true)
                .is('deleted_at', null)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return (data || []) as PendingSeverityApproval[];
        },
        enabled: !!profile?.tenant_id && !!user?.id && !rolesLoading,
    });
}

// Fetch incidents with pending potential severity changes (HSSE Manager/Admin only)
export function usePendingPotentialSeverityApprovals() {
    const { profile, user } = useAuth();
    const { hasRole, isLoading: rolesLoading } = useUserRoles();

    const isAdmin = hasRole('admin');
    const isHSSEManager = hasRole('hsse_manager');
    const canApprove = isAdmin || isHSSEManager;

    return useQuery({
        queryKey: ['pending-potential-severity-approvals', profile?.tenant_id, canApprove],
        queryFn: async () => {
            if (!profile?.tenant_id || !user?.id) return [];

            // Only admin or HSSE manager can approve potential severity changes
            if (!canApprove) return [];

            const { data, error } = await supabase
                .from('incidents')
                .select(`
          id, reference_id, title, potential_severity_v2, original_potential_severity_v2,
          potential_severity_justification, potential_severity_pending_approval, created_at,
          reporter:profiles!incidents_reporter_id_fkey(id, full_name)
        `)
                .eq('tenant_id', profile.tenant_id)
                .eq('potential_severity_pending_approval', true)
                .is('deleted_at', null)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return (data || []) as PendingPotentialSeverityApproval[];
        },
        enabled: !!profile?.tenant_id && !!user?.id && !rolesLoading,
    });
}

// Check if user can access approvals tab
export function useCanAccessApprovals() {
    const { hasRole, hasRoleInCategory, isLoading } = useUserRoles();

    const canAccess = !isLoading && (
        hasRole('admin') ||
        hasRole('manager') ||
        hasRoleInCategory('hsse') ||
        hasRoleInCategory('environmental')
    );

    // Only specific roles can verify corrective actions per permission matrix
    const canVerifyActions = !isLoading && (
        hasRole('admin') ||
        hasRole('hsse_manager') ||
        hasRole('hsse_expert') ||
        hasRole('environmental_expert') ||
        hasRole('environmental_manager')
    );

    const canApproveSeverity = !isLoading && (
        hasRole('admin') ||
        hasRole('hsse_manager')
    );

    return { canAccess, canApproveSeverity, canVerifyActions, isLoading };
}

// Fetch incidents pending manager approval for the current user
export function usePendingIncidentApprovals() {
    const { profile, user, isLoading: authLoading } = useAuth();

    return useQuery({
        queryKey: ['pending-incident-approvals', profile?.tenant_id, user?.id],
        queryFn: async () => {
            // Double-check requirements inside queryFn
            if (!profile?.tenant_id || !user?.id) {
                logger.debug('[PendingApprovals] Missing tenant_id or user_id:', {
                    tenant_id: profile?.tenant_id,
                    user_id: user?.id
                });
                return [];
            }

            logger.debug('[PendingApprovals] Fetching incidents for tenant:', profile.tenant_id, 'user:', user.id);

            // Get incidents that are pending manager approval or escalated to HSSE Manager
            // Use filter to bypass TypeScript strict type check for new status values
            // Include contractor consultant workflow statuses (expert_screening is legacy, pending_consultant_* are new)
            const pendingStatuses = [
                'pending_manager_approval',
                'hsse_manager_escalation',
                'pending_closure',
                'pending_final_closure',
                'pending_dept_rep_approval',
                'pending_dept_rep_incident_review',
                // Contractor Consultant workflow statuses
                'expert_screening',
                'pending_consultant_screening',
                'pending_consultant_review',
                'pending_consultant_actions',
                // Contractor Violation Approval workflow statuses
                'pending_department_manager_violation_approval',
                'pending_contract_controller_approval'
            ];
            const { data: incidents, error } = await supabase
                .from('incidents')
                .select(`
          id, reference_id, title, status, severity, event_type, created_at,
          location, location_city, latitude, longitude,
          reporter:profiles!incidents_reporter_id_fkey(id, full_name),
          reporter_id,
          site:sites!incidents_site_id_fkey(id, name, latitude, longitude),
          branch:branches!incidents_branch_id_fkey(id, name)
        `)
                .eq('tenant_id', profile.tenant_id)
                .filter('status', 'in', `(${pendingStatuses.join(',')})`)
                .is('deleted_at', null)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('[PendingApprovals] Error fetching incidents:', error);
                throw error;
            }

            logger.debug('[PendingApprovals] Found incidents:', incidents?.length || 0, incidents);

            if (!incidents || incidents.length === 0) return [];

            // Filter to only incidents where current user can approve
            const approvableIncidents: PendingIncidentApproval[] = [];

            for (const incident of incidents) {
                try {
                    const { data: canApprove, error: rpcError } = await supabase.rpc('can_approve_investigation', {
                        _user_id: user.id,
                        _incident_id: incident.id,
                    });

                    if (rpcError) {
                        console.error('[PendingApprovals] RPC error for incident:', incident.id, rpcError);
                        continue; // Skip this incident but continue processing others
                    }

                    logger.debug('[PendingApprovals] can_approve_investigation result:', incident.reference_id, canApprove);

                    if (canApprove) {
                        approvableIncidents.push({
                            id: incident.id,
                            reference_id: incident.reference_id,
                            title: incident.title,
                            status: incident.status,
                            severity: incident.severity,
                            event_type: incident.event_type,
                            created_at: incident.created_at,
                            reporter: incident.reporter as { id: string; full_name: string | null } | null,
                        });
                    }
                } catch (err) {
                    console.error('[PendingApprovals] Exception checking approval for incident:', incident.id, err);
                    // Continue processing other incidents
                }
            }

            logger.debug('[PendingApprovals] Final approvable incidents:', approvableIncidents.length, approvableIncidents);
            return approvableIncidents;
        },
        // Only enable when auth is fully loaded AND we have the required data
        enabled: !authLoading && !!profile?.tenant_id && !!user?.id,
        // Refetch on window focus for fresh data
        refetchOnWindowFocus: true,
    });
}
