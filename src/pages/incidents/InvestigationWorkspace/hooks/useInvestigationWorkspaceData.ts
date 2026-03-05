import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIncidents, useIncident } from '@/features/incidents';
import { useInvestigation, useCorrectiveActions } from '@/features/investigation';
import { useIncidentClosureEligibility, useIncidentClosureApproval } from '@/features/incidents';
import { useCanApproveInvestigation } from '@/features/incidents';
import { usePendingIncidentApprovals } from "@/hooks/use-pending-approvals";
import { useInvestigationEditAccess } from '@/features/investigation';
import { useUserRoles } from '@/features/users';
import { useIsAssignedClinicUser } from "@/hooks/use-injury-assignment";
import { useIsAssignedTechEvaluator } from "@/hooks/use-property-damage-assignment";
import { useIsAssignedEnvironmentalExpert } from "@/hooks/use-environmental-assignment";
import { useAuth } from "@/contexts/AuthContext";

export function useInvestigationWorkspaceData(selectedIncidentId: string | null) {
    const { user } = useAuth();
    const { hasRole } = useUserRoles();
    const queryClient = useQueryClient();

    const { data: correctiveActions } = useCorrectiveActions(selectedIncidentId);
    const actionsCount = correctiveActions?.length || 0;

    const { data: incidents, isLoading: loadingIncidents } = useIncidents();
    const { data: pendingApprovals, isLoading: loadingPending } = usePendingIncidentApprovals();
    const { data: selectedIncident, refetch: refetchIncident } = useIncident(selectedIncidentId || undefined);
    const { data: investigation, refetch: refetchInvestigation } = useInvestigation(selectedIncidentId);
    const { data: closureEligibility } = useIncidentClosureEligibility(selectedIncidentId);
    const { approveClosureMutation, rejectClosureMutation } = useIncidentClosureApproval(selectedIncidentId || '');

    const { data: canApprove = false } = useCanApproveInvestigation(selectedIncidentId);

    const { data: workflowActors } = useQuery({
        queryKey: ['workflow-actors', selectedIncidentId],
        queryFn: async () => {
            if (!selectedIncidentId) return null;

            const { data: incidentData } = await supabase
                .from('incidents')
                .select(`
          id,
          created_at,
          reporter_id,
          dept_rep_approved_by,
          dept_rep_approved_at,
          expert_screened_by,
          expert_screened_at,
          approval_manager_id,
          manager_decision_at,
          hsse_manager_decision_by,
          closure_approved_by,
          closure_approved_at
        `)
                .eq('id', selectedIncidentId)
                .single();

            if (!incidentData) return null;

            const profileIds = [
                incidentData.reporter_id,
                incidentData.dept_rep_approved_by,
                incidentData.expert_screened_by,
                incidentData.approval_manager_id,
                incidentData.hsse_manager_decision_by,
                incidentData.closure_approved_by
            ].filter(Boolean) as string[];

            let profiles: Record<string, unknown>[] = [];
            if (profileIds.length > 0) {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', profileIds);
                if (data) profiles = data;
            }

            const profileMap = new Map(profiles.map(p => [p.id, p.full_name]));

            const { data: invData } = await supabase
                .from('investigations')
                .select('investigator_id')
                .eq('incident_id', selectedIncidentId)
                .maybeSingle();

            let investigatorName: string | null = null;
            if (invData?.investigator_id) {
                const { data: invProfile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', invData.investigator_id)
                    .single();
                investigatorName = invProfile?.full_name || null;
            }

            return {
                submitted_by: { full_name: profileMap.get(incidentData.reporter_id || '') || null, timestamp: incidentData.created_at },
                dept_rep: { full_name: profileMap.get(incidentData.dept_rep_approved_by || '') || null, timestamp: incidentData.dept_rep_approved_at },
                expert_screener: { full_name: profileMap.get(incidentData.expert_screened_by || '') || null, timestamp: incidentData.expert_screened_at },
                manager_approver: { full_name: profileMap.get(incidentData.approval_manager_id || '') || null, timestamp: incidentData.manager_decision_at },
                hsse_manager: { full_name: profileMap.get(incidentData.hsse_manager_decision_by || '') || null, timestamp: null },
                investigator: { full_name: investigatorName, timestamp: null },
                closure_approver: { full_name: profileMap.get(incidentData.closure_approved_by || '') || null, timestamp: incidentData.closure_approved_at }
            };
        },
        enabled: !!selectedIncidentId
    });

    const investigatorInfo = workflowActors?.investigator;
    const editAccess = useInvestigationEditAccess(investigation, selectedIncident);
    const isInvestigator = investigation?.investigator_id === user?.id;
    const canAccessGovernance = hasRole('hsse_manager') || hasRole('hsse_expert') || isInvestigator;

    const { isAssignedClinicUser } = useIsAssignedClinicUser(selectedIncidentId);
    const { isAssignedEvaluator: isAssignedTechEvaluator } = useIsAssignedTechEvaluator(selectedIncidentId);
    const { isAssignedExpert: isAssignedEnvironmentalExpert } = useIsAssignedEnvironmentalExpert(selectedIncidentId);

    const canReviewSpecialistData = hasRole('hsse_manager') || hasRole('hsse_expert') || isInvestigator;

    const incidentData = selectedIncident as typeof selectedIncident & {
        closure_requested_by?: string | null;
        closure_requested_at?: string | null;
        closure_request_notes?: string | null;
        closure_approved_by?: string | null;
        closure_approved_at?: string | null;
        closure_rejection_notes?: string | null;
        expert_screened_by?: string | null;
        expert_screened_at?: string | null;
        expert_rejected_by?: string | null;
        expert_rejected_at?: string | null;
        manager_decision?: string | null;
        manager_decision_at?: string | null;
        hsse_manager_decision?: string | null;
        investigator_id?: string | null;
        consultant_screening_notes?: string | null;
        severity_v2?: string | null;
    } | undefined;

    const status = incidentData?.status as string | undefined;
    const investigationAllowed = status ? [
        'investigation_pending', 'under_investigation', 'investigation_in_progress',
        'pending_closure', 'pending_final_closure', 'investigation_closed', 'closed',
        'monitoring_30_day', 'monitoring_60_day', 'monitoring_90_day', 'pending_hsse_incident_validation',
        'expert_screening', 'pending_consultant_screening', 'pending_consultant_review',
        'pending_consultant_actions', 'pending_site_client_approval', 'pending_contractor_implementation',
        'pending_consultant_verification'
    ].includes(status) : false;

    const handleRefresh = () => {
        refetchIncident();
        refetchInvestigation();
        queryClient.invalidateQueries({ queryKey: ['can-review-consultant'] });
        queryClient.invalidateQueries({ queryKey: ['can-screen-consultant'] });
        queryClient.invalidateQueries({ queryKey: ['has-consultant-access'] });
        queryClient.invalidateQueries({ queryKey: ['can-approve-investigation'] });
        queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
        queryClient.invalidateQueries({ queryKey: ['workflow-actors'] });
        queryClient.invalidateQueries({ queryKey: ['investigation-edit-access'] });
    };

    return {
        actionsCount,
        incidents, loadingIncidents,
        pendingApprovals, loadingPending,
        selectedIncident, refetchIncident,
        investigation, refetchInvestigation,
        closureEligibility,
        approveClosureMutation, rejectClosureMutation,
        canApprove,
        workflowActors,
        investigatorInfo,
        editAccess,
        isInvestigator,
        canAccessGovernance,
        isAssignedClinicUser,
        isAssignedTechEvaluator,
        isAssignedEnvironmentalExpert,
        canReviewSpecialistData,
        incidentData,
        status,
        investigationAllowed,
        handleRefresh,
        queryClient
    };
}




