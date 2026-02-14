import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIncidents, useIncident } from "@/hooks/use-incidents";
import { useInvestigation, useCorrectiveActions } from "@/hooks/use-investigation";
import { useIncidentClosureEligibility, useIncidentClosureApproval } from "@/hooks/use-incident-closure";
import { useCanApproveInvestigation } from "@/hooks/use-hsse-workflow";
import { usePendingIncidentApprovals } from "@/hooks/use-pending-approvals";
import { useInvestigationEditAccess } from "@/hooks/use-investigation-edit-access";
import { useUserRoles } from "@/hooks/use-user-roles";
import { useIsAssignedClinicUser } from "@/hooks/use-injury-assignment";
import { useIsAssignedTechEvaluator } from "@/hooks/use-property-damage-assignment";
import { useIsAssignedEnvironmentalExpert } from "@/hooks/use-environmental-assignment";
import { useAuth } from "@/contexts/AuthContext";

// Stress Test: Import ALL components from the original file
import {
    EvidenceManager,
    WitnessPanel,
    RCAPanel,
    ActionsPanel,
    AuditLogPanel,
    OverviewPanel,
    IncidentClosureRequestDialog,
    IncidentClosureApprovalCard,
    InvestigationWorkflowStatusCard,
    HSSEExpertScreeningCard,
    ReporterCorrectionBanner,
    RejectionConfirmationCard,
    ManagerApprovalCard,
    HSSEManagerEscalationCard,
    InvestigatorAssignmentStep,
    DeptRepApprovalCard,
    DeptRepIncidentReviewCard,
    SubmitInvestigationCard,
    CauseCoverageIndicator,
    HSSEEscalationReviewCard,
    EscalationAlertBanner,
    HSSEValidationCard,
    InvestigatorViolationIdentificationCard,
    InvestigatorViolationSubmissionCard,
    IncidentClosurePrerequisitesCard,
    HSSEIncidentValidationCard,
    DeptManagerViolationApprovalCard,
    ContractControllerApprovalCard,
    LegalReviewCard,
    DisputeResolutionCard,
    MonitoringCheckCard,
    ContractorDisputeCard,
    DeptManagerIncidentApprovalCard,
    ClinicReviewCard,
    TeamInvestigationAssignmentStep
} from "@/components/investigation";

import { CloseObservationOnSpotDialog } from "@/components/investigation/CloseObservationOnSpotDialog";
import { ActionDisputeReviewCard, ConsultantReviewCard, SiteClientActionApprovalCard } from "@/components/investigation/contractor-workflow";
import { HSSEEnforcementBanner } from "@/components/investigation/HSSEEnforcementBanner";
import { ObservationWorkflowTracker } from "@/components/investigation/ObservationWorkflowTracker";
import { UnifiedWorkflowTracker } from "@/components/investigation/UnifiedWorkflowTracker";
import { ReopenIncidentDialog } from "@/components/investigation/ReopenIncidentDialog";
import { InjuryPanel } from "@/components/investigation/InjuryPanel";
import { ClinicUserAssignmentCard } from "@/components/investigation/ClinicUserAssignmentCard";
import { PropertyDamagePanel } from "@/components/investigation/property-damage";
import { TechEvaluatorAssignmentCard } from "@/components/investigation/TechEvaluatorAssignmentCard";
import { EnvironmentalImpactPanel } from "@/components/investigation/environmental-impact";
import { EnvironmentalExpertAssignmentCard } from "@/components/investigation/EnvironmentalExpertAssignmentCard";
import { SpecialistDataReviewCard } from "@/components/investigation/SpecialistDataReviewCard";
import { IncidentStatusBadge } from "@/components/incidents/IncidentStatusBadge";

export default function InvestigationWorkspaceDebug() {
    const { t, i18n } = useTranslation();
    const direction = i18n.dir();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlIncidentId = searchParams.get('incident');
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(urlIncidentId);
    const [activeTab, setActiveTab] = useState("overview");
    const [showClosureDialog, setShowClosureDialog] = useState(false);
    const [showReopenDialog, setShowReopenDialog] = useState(false);
    const [showCloseOnSpotDialog, setShowCloseOnSpotDialog] = useState(false);
    const [viewMode, setViewMode] = useState<'my-pending' | 'all'>('my-pending');
    const [showActionDialog, setShowActionDialog] = useState(false);
    const { profile, user } = useAuth();
    const { hasRole } = useUserRoles();
    const queryClient = useQueryClient();

    // Fetch corrective actions count for the selected incident
    const { data: correctiveActions } = useCorrectiveActions(selectedIncidentId);
    const actionsCount = correctiveActions?.length || 0;

    const { data: incidents, isLoading: loadingIncidents } = useIncidents();
    const { data: pendingApprovals, isLoading: loadingPending } = usePendingIncidentApprovals();
    const { data: selectedIncident, refetch: refetchIncident } = useIncident(selectedIncidentId || undefined);
    const { data: investigation, refetch: refetchInvestigation } = useInvestigation(selectedIncidentId);
    const { data: closureEligibility } = useIncidentClosureEligibility(selectedIncidentId);
    const { approveClosureMutation, rejectClosureMutation } = useIncidentClosureApproval(selectedIncidentId || '');

    // Fetch workflow actors for the workflow status card
    const { data: workflowActors } = useQuery({
        queryKey: ['workflow-actors', selectedIncidentId],
        queryFn: async () => {
            if (!selectedIncidentId) return null;

            // Fetch incident with basic fields - use separate queries for profiles
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

            // Collect all profile IDs to fetch
            const profileIds = [
                incidentData.reporter_id,
                incidentData.dept_rep_approved_by,
                incidentData.expert_screened_by,
                incidentData.approval_manager_id,
                incidentData.hsse_manager_decision_by,
                incidentData.closure_approved_by
            ].filter(Boolean) as string[];

            // Fetch all profiles in one query
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', profileIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

            // Also get investigator info from investigation table
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
                submitted_by: {
                    full_name: profileMap.get(incidentData.reporter_id || '') || null,
                    timestamp: incidentData.created_at
                },
                dept_rep: {
                    full_name: profileMap.get(incidentData.dept_rep_approved_by || '') || null,
                    timestamp: incidentData.dept_rep_approved_at
                },
                expert_screener: {
                    full_name: profileMap.get(incidentData.expert_screened_by || '') || null,
                    timestamp: incidentData.expert_screened_at
                },
                manager_approver: {
                    full_name: profileMap.get(incidentData.approval_manager_id || '') || null,
                    timestamp: incidentData.manager_decision_at
                },
                hsse_manager: {
                    full_name: profileMap.get(incidentData.hsse_manager_decision_by || '') || null,
                    timestamp: null
                },
                investigator: {
                    full_name: investigatorName,
                    timestamp: null
                },
                closure_approver: {
                    full_name: profileMap.get(incidentData.closure_approved_by || '') || null,
                    timestamp: incidentData.closure_approved_at
                }
            };
        },
        enabled: !!selectedIncidentId
    });

    // Get investigator name from workflow actors
    const investigatorInfo = workflowActors?.investigator;

    // Investigation edit access control
    const editAccess = useInvestigationEditAccess(investigation, selectedIncident);

    // Check governance tab access
    const isInvestigator = investigation?.investigator_id === user?.id;
    const canAccessGovernance = hasRole('hsse_manager') || hasRole('hsse_expert') || isInvestigator;

    // Specialist assignment checks for review card permissions
    const { isAssignedClinicUser } = useIsAssignedClinicUser(selectedIncidentId);
    const { isAssignedEvaluator: isAssignedTechEvaluator } = useIsAssignedTechEvaluator(selectedIncidentId);
    const { isAssignedExpert: isAssignedEnvironmentalExpert } = useIsAssignedEnvironmentalExpert(selectedIncidentId);

    // Leader/reviewer can approve specialist data (HSSE Manager, HSSE Expert, or assigned investigator)
    const canReviewSpecialistData = hasRole('hsse_manager') || hasRole('hsse_expert') || isInvestigator;

    // Type assertion for incident fields not in generated types yet
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

    // Check if user can approve closure using RPC function (enforces role-based and conflict-of-interest checks)
    const { data: canApprove = false } = useCanApproveInvestigation(selectedIncidentId);

    // Render workflow cards - placeholder for now
    const renderWorkflowCards = () => null;

    const getStatusBorderColor = (status: string) => {
        // simplified version for debug
        if (status === 'closed') return 'border-green-500';
        return 'border-orange-500';
    }

    return (
        <div className="container max-w-7xl py-8 space-y-8 overflow-x-hidden" dir={direction}>
            {/* Modern Executive Header */}
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/incidents')}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                        {t('incidents.backToList', 'Back to Event List')}
                    </Button>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                                <CheckCircle2 className="h-7 w-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">
                                    Investigation Workspace (Debug)
                                </h1>
                                <p className="text-muted-foreground mt-1">
                                    Debug Mode: Checking Header & Incident Selection Rendering
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Incident Selection Section */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-3">
                        Select Incident
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    {loadingIncidents && viewMode !== 'my-pending' ? (
                        <div className="p-4">Loading Incidents...</div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-muted-foreground">
                                Incidents Loaded: {incidents?.length || 0}
                            </p>

                            {/* Manually render list to see if Select crashes */}
                            <div className="space-y-2">
                                {incidents?.slice(0, 3).map(inc => (
                                    <div key={inc.id} className="p-2 border rounded flex justify-between">
                                        <span>{inc.title}</span>
                                        <IncidentStatusBadge status={inc.status} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Debug Status */}
            <Card className="border-green-500 border-2">
                <CardContent className="pt-6">
                    <p className="font-medium text-green-700">
                        If you see this, the Header and Incident List rendering are SAFE.
                    </p>
                </CardContent>
            </Card>

        </div>
    );
}
