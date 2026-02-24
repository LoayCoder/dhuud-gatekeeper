// Investigation Workspace - Main page for incident investigation
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  FileSearch,
  Users,
  Search,
  ListChecks,
  LayoutDashboard,
  Lock,
  AlertCircle,
  ClipboardCheck,
  List,
  Eye,
  RotateCcw,
  FileText,
  RefreshCw,
  Wrench,
  ArrowLeft,
  UserCheck,
  HeartPulse,
  Leaf,
  Scale,
  Clock
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIncidents, useIncident } from "@/hooks/use-incidents";
import { useInvestigation, useCorrectiveActions } from "@/hooks/use-investigation";
import { useIncidentClosureEligibility, useIncidentClosureApproval } from "@/hooks/use-incident-closure";
import { useCanApproveInvestigation } from "@/hooks/use-hsse-workflow";
import { usePendingIncidentApprovals } from "@/hooks/use-pending-approvals";
import { useInvestigationEditAccess } from "@/hooks/use-investigation-edit-access";
import { useUserRoles } from "@/hooks/use-user-roles";
import {
  EvidenceManager,
  WitnessPanel,
  RCAPanel,
  ActionsPanel,
  AuditLogPanel,
  OverviewPanel,
  IncidentClosureRequestDialog,
  IncidentClosureApprovalCard,
  CurrentOwnerCard,
  UnifiedTimelineTracker,
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
  // New incident violation & closure components
  InvestigatorViolationIdentificationCard,
  InvestigatorViolationSubmissionCard,
  IncidentClosurePrerequisitesCard,
  HSSEIncidentValidationCard,
  // Contractor Violation Approval Workflow
  DeptManagerViolationApprovalCard,
  ContractControllerApprovalCard,
  // Gap workflow components
  LegalReviewCard,
  DisputeResolutionCard,
  MonitoringCheckCard,
  ContractorDisputeCard,
  // New severity-based workflow components
  DeptManagerIncidentApprovalCard,
  ClinicReviewCard,
  TeamInvestigationAssignmentStep
} from "@/components/investigation";
import { CloseObservationOnSpotDialog } from "@/components/investigation/CloseObservationOnSpotDialog";
import { ActionDisputeReviewCard, ConsultantReviewCard, SiteClientActionApprovalCard } from "@/components/investigation/contractor-workflow";
import { HSSEEnforcementBanner } from "@/components/investigation/HSSEEnforcementBanner";
import { ReopenIncidentDialog } from "@/components/investigation/ReopenIncidentDialog";
import { InjuryPanel } from "@/components/investigation/InjuryPanel";
import { ClinicUserAssignmentCard } from "@/components/investigation/ClinicUserAssignmentCard";
import { PropertyDamagePanel } from "@/components/investigation/property-damage";
import { TechEvaluatorAssignmentCard } from "@/components/investigation/TechEvaluatorAssignmentCard";
import { EnvironmentalImpactPanel } from "@/components/investigation/environmental-impact";
import { EnvironmentalExpertAssignmentCard } from "@/components/investigation/EnvironmentalExpertAssignmentCard";
import { SpecialistDataReviewCard } from "@/components/investigation/SpecialistDataReviewCard";
import { useIsAssignedClinicUser } from "@/hooks/use-injury-assignment";
import { useIsAssignedTechEvaluator } from "@/hooks/use-property-damage-assignment";
import { useIsAssignedEnvironmentalExpert } from "@/hooks/use-environmental-assignment";
import { IncidentStatusBadge } from "@/components/incidents/IncidentStatusBadge";
import { ResponsibleUserBadge } from "@/components/incidents/workflow/ResponsibleUserBadge";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getStatusBorderColor, getStatusCategory } from "@/lib/incident-status-colors";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SeverityLevelV2 } from "@/lib/hsse-severity-levels";
import { InvestigationListView } from "@/components/investigation/InvestigationListView";
import { calculateInvestigationSLA } from "@/lib/investigation-sla";
import { LockedTabTrigger } from "@/components/investigation/navigation/LockedTabTrigger";

export default function InvestigationWorkspace() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlIncidentId = searchParams.get('incident');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(urlIncidentId);

  // Sync state with URL parameter changes
  useEffect(() => {
    if (urlIncidentId !== selectedIncidentId) {
      setSelectedIncidentId(urlIncidentId);
    }
  }, [urlIncidentId, selectedIncidentId]);
  const [activeTab, setActiveTab] = useState("overview");
  const [unlockedTabs, setUnlockedTabs] = useState(['overview']);
  const [completedTabs, setCompletedTabs] = useState<string[]>([]);
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
      let profiles: any[] = [];
      if (profileIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', profileIds);
        if (data) profiles = data;
      }

      const profileMap = new Map(profiles.map(p => [p.id, p.full_name]));

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

  // Handler for Create Action button - switches to actions tab and triggers dialog
  const handleCreateAction = () => {
    setActiveTab('actions');
    setShowActionDialog(true);
  };

  const handleRefresh = () => {
    // Refetch incident and investigation data
    refetchIncident();
    refetchInvestigation();

    // Invalidate ALL permission-related query caches to force fresh RPC calls
    // This resolves stale cache issues for role-based access checks (e.g., Consultant Review card)
    queryClient.invalidateQueries({ queryKey: ['can-review-consultant'] });
    queryClient.invalidateQueries({ queryKey: ['can-screen-consultant'] });
    queryClient.invalidateQueries({ queryKey: ['has-consultant-access'] });
    queryClient.invalidateQueries({ queryKey: ['can-approve-investigation'] });
    queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-actors'] });
    queryClient.invalidateQueries({ queryKey: ['investigation-edit-access'] });

    console.log('[Refresh] Invalidated all permission caches for incident:', selectedIncidentId);
  };

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

  // Determine if investigation tabs should be enabled
  // Cast to string to handle new enum values not yet in types
  const status = incidentData?.status as string | undefined;
  const investigationAllowed = status && [
    'investigation_pending',
    'under_investigation',
    'investigation_in_progress',
    'pending_closure',
    'pending_final_closure',
    'investigation_closed',
    'closed',
    'monitoring_30_day',
    'monitoring_60_day',
    'monitoring_90_day',
    'pending_hsse_incident_validation',
    // Contractor consultant workflow statuses
    'expert_screening',
    'pending_consultant_screening',
    'pending_consultant_review',
    'pending_consultant_actions',
    'pending_site_client_approval',
    'pending_contractor_implementation',
    'pending_consultant_verification',
  ].includes(status);



  // Render workflow cards based on current status
  const renderWorkflowCards = () => {
    if (!incidentData) return null;

    // Cast status to string to handle new enum values not yet in generated types
    const currentStatus = incidentData.status as string;

    switch (currentStatus) {
      case 'submitted':
        return (
          <HSSEExpertScreeningCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'returned_to_reporter':
        return (
          <ReporterCorrectionBanner
            incident={incidentData}
            onEdit={() => {/* TODO: Navigate to edit form */ }}
            onComplete={handleRefresh}
          />
        );

      case 'expert_rejected':
        return (
          <RejectionConfirmationCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'pending_manager_approval':
        return (
          <ManagerApprovalCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'pending_dept_rep_approval':
        // Observations go through DeptRepApprovalCard (full access with actions)
        return (
          <DeptRepApprovalCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'pending_dept_rep_incident_review':
        // Incidents go through DeptRepIncidentReviewCard (read-only, approve/reject only)
        return (
          <DeptRepIncidentReviewCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'manager_rejected':
      case 'hsse_manager_escalation':
        return (
          <HSSEManagerEscalationCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'pending_hsse_escalation_review':
        // HSSE Expert reviews escalation request from Dept Rep
        return (
          <HSSEEscalationReviewCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'investigation_pending':
        // Check severity for team investigation requirement
        const severityLevel = incidentData.severity_v2 || (incidentData as any).severity;
        const severityNumber = severityLevel ? parseInt(severityLevel.replace('level_', '')) : 1;

        // For L4-5, use TeamInvestigationAssignmentStep; for L3, it handles the toggle internally
        if (severityNumber >= 3) {
          return (
            <TeamInvestigationAssignmentStep
              incident={incidentData}
              onComplete={handleRefresh}
            />
          );
        }

        return (
          <InvestigatorAssignmentStep
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'pending_department_manager_approval':
        return (
          <DeptManagerIncidentApprovalCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'pending_clinic_review':
        return (
          <ClinicReviewCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      // --- CONTRACTOR VIOLATION APPROVAL WORKFLOW ---
      case 'pending_department_manager_violation_approval':
        return (
          <DeptManagerViolationApprovalCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'pending_contract_controller_approval':
        return (
          <ContractControllerApprovalCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'upgraded_to_incident':
        // Show info that observation was upgraded - could show link to new incident
        return null;

      case 'pending_hsse_validation':
        return (
          <HSSEValidationCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      // --- NEW INCIDENT WORKFLOW STATUSES ---

      case 'pending_legal_review':
        return (
          <LegalReviewCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'dispute_resolution':
        return (
          <DisputeResolutionCard
            incident={incidentData}
            investigation={investigation || undefined}
            onComplete={handleRefresh}
          />
        );

      case 'monitoring_30_day':
      case 'monitoring_60_day':
      case 'monitoring_90_day':
        return (
          <MonitoringCheckCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'pending_contractor_dispute_review':
        return (
          <ContractorDisputeCard
            incident={incidentData}
            contractorId={(incidentData as any).related_contractor_company_id}
            onComplete={handleRefresh}
          />
        );

      case 'pending_final_closure':
      case 'pending_hsse_incident_validation':
        return (
          <HSSEIncidentValidationCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      // --- CONTRACTOR OBSERVATION WORKFLOW STATUSES ---

      // Legacy status (expert_screening) and new status (pending_consultant_screening)
      case 'expert_screening':
      case 'pending_consultant_screening':
      case 'pending_consultant_review':
      case 'pending_consultant_actions':
        return (
          <ConsultantReviewCard
            incidentId={incidentData.id}
            status={currentStatus}
            assigneeId={incidentData.approval_manager_id}
            severityLevel={incidentData.severity_v2 ? incidentData.severity_v2 as SeverityLevelV2 : undefined}
            hasActions={actionsCount > 0}
            actionsCount={actionsCount}
            onActionCreated={handleCreateAction}
            onComplete={handleRefresh}
          />
        );

      case 'pending_site_client_approval':
        return (
          <SiteClientActionApprovalCard
            incidentId={incidentData.id}
            status={currentStatus}
            actionsCount={actionsCount}
            consultantNotes={incidentData.consultant_screening_notes || undefined}
          />
        );

      case 'pending_dept_rep_review':
        return (
          <DeptRepApprovalCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'pending_hsse_expert_review':
        return (
          <HSSEValidationCard
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );

      case 'pending_action_dispute_review':
        return (
          <ActionDisputeReviewCard
            incidentId={incidentData.id}
            status={currentStatus}
            disputeReason={(incidentData as any).action_dispute_reason}
            contractorComments={(incidentData as any).contractor_dispute_comments}
            onResolved={handleRefresh}
          />
        );

      case 'hsse_enforced':
        return (
          <HSSEEnforcementBanner
            enforcedAt={(incidentData as any).hsse_enforced_at}
            enforcedBy={(incidentData as any).hsse_enforced_by_profile}
            enforcementNotes={(incidentData as any).enforcement_notes}
          />
        );

      default:
        return null;
    }
  };

  const isTabLocked = (tabKey: string) => !unlockedTabs.includes(tabKey);
  const isTabCompleted = (tabKey: string) => completedTabs.includes(tabKey);

  const startInvestigation = () => {
    // Determine condition for environmental tab
    const showEnvironmental = selectedIncident?.event_type === 'environmental' ||
      selectedIncident?.event_type === 'environment' ||
      ['oil_chemical_spill_land', 'spill_to_water', 'air_emission', 'soil_contamination',
        'waste_mismanagement', 'wildlife_impact', 'non_compliant_discharge'].includes(selectedIncident?.subtype || '');

    const newUnlocked = ['overview', 'evidence', 'witnesses', 'rca', 'actions'];
    if (selectedIncident?.has_injury) newUnlocked.push('injuries');
    if (selectedIncident?.has_damage) newUnlocked.push('property-damage');
    if (showEnvironmental) newUnlocked.push('environmental-impact');
    if (canAccessGovernance) newUnlocked.push('governance');

    setUnlockedTabs(newUnlocked);
    setActiveTab('evidence'); // auto-switch to evidence
  };

  // If no incident is selected, render the ListView
  if (!selectedIncidentId) {
    return (
      <div className="container max-w-7xl py-8 overflow-x-hidden" dir={direction}>
        <InvestigationListView />
      </div>
    );
  }

  // Calculate SLA for the detail view header
  let slaInfo = null;
  if (incidentData) {
    slaInfo = calculateInvestigationSLA(incidentData.created_at || new Date().toISOString(), incidentData.severity_v2 || (incidentData as any).severity);
  }

  return (
    <div className="container max-w-7xl py-8 space-y-8 overflow-x-hidden" dir={direction}>
      {/* Modern Executive Header */}
      <div className="space-y-6">
        {/* Navigation Row & SLA Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedIncidentId(null);
              // reset URL
              navigate('/incidents/investigate');
            }}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t('incidents.backToList', 'Back to Event List')}
          </Button>

          {slaInfo && (
            <div className={cn(
              "flex items-center gap-2 text-sm font-semibold rounded-full px-4 py-1.5 border shadow-sm",
              slaInfo.status === 'red' ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900" :
                slaInfo.status === 'yellow' ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900" :
                  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
            )}>
              {slaInfo.status === 'red' ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {slaInfo.isOverdue
                ? t('investigation.sla.overdueBy', { count: Math.abs(slaInfo.daysRemaining), defaultValue: `${Math.abs(slaInfo.daysRemaining)}d OVERDUE` })
                : t('investigation.sla.daysRemaining', { count: slaInfo.daysRemaining, defaultValue: `${slaInfo.daysRemaining}d ${slaInfo.hoursRemaining}h REMAINING` })
              }
            </div>
          )}
        </div>

        {/* Header Content */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <FileSearch className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {incidentData?.reference_id || t('investigation.title', 'Investigation')}
                </h1>
                <p className="text-muted-foreground mt-1 text-lg">
                  {incidentData?.title}
                </p>
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            {selectedIncidentId && selectedIncident?.event_type === 'observation' && selectedIncident?.status !== 'closed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCloseOnSpotDialog(true)}
                className="gap-2 border-green-600/50 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
              >
                <ClipboardCheck className="h-4 w-4" />
                {t('incidents.closedOnSpot.label', 'Close On Spot')}
              </Button>
            )}
            {selectedIncidentId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {t('common.refresh', 'Refresh')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Card is now in InvestigationListView */}

      {/* Current Owner & Status Bar - Only when incident selected */}
      {selectedIncidentId && selectedIncident && (
        <CurrentOwnerCard incident={selectedIncident as any} />
      )}

      {/* Investigation Content */}
      {selectedIncidentId && incidentData ? (
        <>
          {/* Unified Horizontal Timeline Tracker */}
          <div className="my-4">
            <UnifiedTimelineTracker incident={incidentData} />
          </div>

          {/* Escalation Alert Banner - Shows when observation triggered escalation */}
          <EscalationAlertBanner incident={incidentData} />

          {/* Workflow-Specific Cards */}
          {renderWorkflowCards()}

          {/* Closure Prerequisites Card - Show during final closure stages */}
          {status && ['pending_final_closure', 'pending_hsse_incident_validation'].includes(status) && (
            <IncidentClosurePrerequisitesCard incidentId={selectedIncidentId} />
          )}

          {/* Removed legacy observation workflow tracker */}

          {/* Warning if investigation not yet allowed */}
          {!investigationAllowed && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <AlertCircle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t('investigation.workflow.pendingApproval', 'Pending Approval')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('investigation.workflow.completeWorkflowFirst', 'Complete the approval workflow above before accessing investigation tools.')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Read-only oversight banner */}
          {investigationAllowed && editAccess.isReadOnly && !editAccess.isClosed && (
            <Alert className="border-info/30 bg-info/5">
              <Eye className="h-4 w-4 text-info" />
              <AlertDescription className="text-foreground">
                {editAccess.isOversightRole
                  ? t('investigation.readOnly.oversightBanner', 'You have read-only access to monitor this investigation. Only the assigned investigator can make changes.')
                  : t('investigation.readOnly.notAssigned', 'You are not the assigned investigator. Investigation data is read-only.')}
              </AlertDescription>
            </Alert>
          )}

          {/* Closed incident banner with reopen option */}
          {editAccess.isClosed && (
            <Alert className="border-success/30 bg-success/5">
              <Lock className="h-4 w-4 text-success" />
              <AlertDescription className="flex items-center justify-between text-foreground">
                <span>{t('investigation.readOnly.closedBanner', 'This incident is closed and all data is locked.')}</span>
                {editAccess.canReopen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReopenDialog(true)}
                    className="ms-4 border-success/30 hover:bg-success/10"
                  >
                    <RotateCcw className="h-4 w-4 me-2" />
                    {t('investigation.reopen.button', 'Reopen Investigation')}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Investigation Tabs - Modern Design */}
          <Card className="border-0 shadow-md overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction} className="w-full">
              <div className="bg-muted/30 border-b px-4 pt-4">
                <TabsList className="flex flex-wrap h-auto gap-2 w-full bg-transparent p-0">
                  <TabsTrigger
                    value="overview"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline font-medium">{t('investigation.tabs.overview', 'Overview')}</span>
                  </TabsTrigger>

                  <LockedTabTrigger
                    value="evidence"
                    icon={FileSearch}
                    label={t('investigation.tabs.evidence', 'Evidence')}
                    isLocked={!investigationAllowed || isTabLocked('evidence')}
                    isCompleted={isTabCompleted('evidence')}
                  />
                  <LockedTabTrigger
                    value="witnesses"
                    icon={Users}
                    label={t('investigation.tabs.witnesses', 'Witnesses')}
                    isLocked={!investigationAllowed || isTabLocked('witnesses')}
                    isCompleted={isTabCompleted('witnesses')}
                  />
                  <LockedTabTrigger
                    value="rca"
                    icon={Search}
                    label={t('investigation.tabs.rca', 'RCA')}
                    isLocked={!investigationAllowed || isTabLocked('rca')}
                    isCompleted={isTabCompleted('rca')}
                  />
                  <LockedTabTrigger
                    value="actions"
                    icon={ListChecks}
                    label={t('investigation.tabs.actions', 'Actions')}
                    isLocked={!investigationAllowed || isTabLocked('actions')}
                    isCompleted={isTabCompleted('actions')}
                  />
                  <LockedTabTrigger
                    value="injuries"
                    icon={HeartPulse}
                    label={t('investigation.tabs.injuries', 'Injuries')}
                    hidden={!selectedIncident?.has_injury}
                    isLocked={!investigationAllowed || isTabLocked('injuries')}
                    isCompleted={isTabCompleted('injuries')}
                  />
                  <LockedTabTrigger
                    value="property-damage"
                    icon={Wrench}
                    label={t('investigation.tabs.propertyDamage', 'Property Damage')}
                    hidden={!selectedIncident?.has_damage}
                    isLocked={!investigationAllowed || isTabLocked('property-damage')}
                    isCompleted={isTabCompleted('property-damage')}
                  />
                  <LockedTabTrigger
                    value="environmental-impact"
                    icon={Leaf}
                    label={t('investigation.tabs.environmentalImpact', 'Environmental Impact')}
                    hidden={!(selectedIncident?.event_type === 'environmental' ||
                      selectedIncident?.event_type === 'environment' ||
                      ['oil_chemical_spill_land', 'spill_to_water', 'air_emission', 'soil_contamination',
                        'waste_mismanagement', 'wildlife_impact', 'non_compliant_discharge'].includes(selectedIncident?.subtype || ''))}
                    isLocked={!investigationAllowed || isTabLocked('environmental-impact')}
                    isCompleted={isTabCompleted('environmental-impact')}
                  />
                  <LockedTabTrigger
                    value="governance"
                    icon={Scale}
                    label={t('investigation.tabs.governance', 'Governance')}
                    hidden={!canAccessGovernance}
                    isLocked={!investigationAllowed || isTabLocked('governance')}
                    isCompleted={isTabCompleted('governance')}
                  />
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="overview" className="mt-0">
                  <OverviewPanel
                    incident={selectedIncident}
                    investigation={investigation ?? null}
                    onRefresh={handleRefresh}
                    canApprove={canApprove}
                    onStartInvestigation={startInvestigation}
                    isStarted={unlockedTabs.length > 1}
                    unlockedTabs={unlockedTabs}
                    completedTabs={completedTabs}
                  />
                </TabsContent>

                <TabsContent value="evidence" className="mt-0">
                  {investigationAllowed ? (
                    <EvidenceManager
                      incidentId={selectedIncidentId}
                      incidentStatus={selectedIncident?.status}
                      canEdit={editAccess.canEdit}
                    />
                  ) : null}
                </TabsContent>

                <TabsContent value="witnesses" className="mt-0">
                  {investigationAllowed ? (
                    <WitnessPanel
                      incidentId={selectedIncidentId}
                      incident={selectedIncident}
                      incidentStatus={selectedIncident?.status}
                      canEdit={editAccess.canEdit}
                    />
                  ) : null}
                </TabsContent>

                <TabsContent value="rca" className="mt-0">
                  {investigationAllowed ? (
                    <RCAPanel
                      incidentId={selectedIncidentId}
                      incidentStatus={selectedIncident?.status}
                      incidentTitle={selectedIncident?.title}
                      incidentDescription={selectedIncident?.description}
                      incidentSeverity={selectedIncident?.severity}
                      incidentEventType={selectedIncident?.event_type}
                      canEdit={editAccess.canEdit}
                    />
                  ) : null}
                </TabsContent>

                <TabsContent value="actions" className="mt-0 space-y-4">
                  {investigationAllowed ? (
                    <>
                      {/* Cause Coverage Indicator */}
                      <CauseCoverageIndicator incidentId={selectedIncidentId} />

                      {/* Actions List */}
                      <ActionsPanel
                        incidentId={selectedIncidentId}
                        incidentStatus={selectedIncident?.status}
                        canEdit={editAccess.canEdit}
                        openDialogTrigger={showActionDialog}
                        onDialogTriggered={() => setShowActionDialog(false)}
                      />

                      {/* Submit Investigation Card - Only for investigator when in progress */}
                      {editAccess.canEdit && incidentData?.status === 'investigation_in_progress' && (
                        <SubmitInvestigationCard
                          incidentId={selectedIncidentId}
                          onSubmitted={handleRefresh}
                        />
                      )}
                    </>
                  ) : null}
                </TabsContent>

                {/* Injuries Tab Content */}
                <TabsContent value="injuries" className="mt-0 space-y-4">
                  {investigationAllowed && selectedIncident?.has_injury ? (
                    <>
                      {/* Clinic User Assignment Card */}
                      {incidentData && (
                        <ClinicUserAssignmentCard
                          incident={incidentData}
                          onComplete={handleRefresh}
                        />
                      )}
                      <InjuryPanel
                        incidentId={selectedIncidentId!}
                        canEdit={editAccess.canEdit}
                      />
                      {/* Specialist Data Review Card - Submit for Review / Approve */}
                      <SpecialistDataReviewCard
                        incidentId={selectedIncidentId!}
                        dataType="injury"
                        canSubmit={isAssignedClinicUser}
                        canReview={canReviewSpecialistData}
                      />
                    </>
                  ) : null}
                </TabsContent>

                {/* Property Damage Tab Content */}
                <TabsContent value="property-damage" className="mt-0 space-y-4">
                  {investigationAllowed && selectedIncident?.has_damage ? (
                    <>
                      {/* Tech Evaluator Assignment Card */}
                      {incidentData && (
                        <TechEvaluatorAssignmentCard
                          incident={incidentData}
                          onComplete={handleRefresh}
                        />
                      )}
                      <PropertyDamagePanel
                        incidentId={selectedIncidentId!}
                        canEdit={editAccess.canEdit}
                      />
                      {/* Specialist Data Review Card - Submit for Review / Approve */}
                      <SpecialistDataReviewCard
                        incidentId={selectedIncidentId!}
                        dataType="property_damage"
                        canSubmit={isAssignedTechEvaluator}
                        canReview={canReviewSpecialistData}
                      />
                    </>
                  ) : null}
                </TabsContent>

                {/* Environmental Impact Tab Content */}
                <TabsContent value="environmental-impact" className="mt-0 space-y-4">
                  {investigationAllowed && (selectedIncident?.event_type === 'environmental' ||
                    selectedIncident?.event_type === 'environment' ||
                    ['oil_chemical_spill_land', 'spill_to_water', 'air_emission', 'soil_contamination',
                      'waste_mismanagement', 'wildlife_impact', 'non_compliant_discharge'].includes(selectedIncident?.subtype || '')) ? (
                    <>
                      {/* Environmental Expert Assignment Card */}
                      {incidentData && (
                        <EnvironmentalExpertAssignmentCard
                          incident={incidentData}
                          onComplete={handleRefresh}
                        />
                      )}
                      <EnvironmentalImpactPanel
                        incidentId={selectedIncidentId!}
                        canEdit={editAccess.canEdit}
                      />
                      {/* Specialist Data Review Card - Submit for Review / Approve */}
                      <SpecialistDataReviewCard
                        incidentId={selectedIncidentId!}
                        dataType="environmental"
                        canSubmit={isAssignedEnvironmentalExpert}
                        canReview={canReviewSpecialistData}
                      />
                    </>
                  ) : null}
                </TabsContent>

                {/* Governance Tab Content */}
                <TabsContent value="governance" className="mt-0 space-y-4">
                  {canAccessGovernance && investigationAllowed ? (
                    <>
                      {/* Investigator Violation Cards - Moved here */}
                      {status === 'investigation_in_progress' && (incidentData as any).related_contractor_company_id && investigation && (
                        <>
                          <InvestigatorViolationIdentificationCard
                            incident={incidentData}
                            investigation={investigation}
                            onComplete={handleRefresh}
                          />
                          <InvestigatorViolationSubmissionCard
                            incident={incidentData}
                            investigation={investigation}
                            onComplete={handleRefresh}
                          />
                        </>
                      )}
                    </>
                  ) : null}
                </TabsContent>
              </div>
            </Tabs>
          </Card>

          {/* Closure Approval Card - show if closure is pending (either investigation or final) */}
          {(['pending_closure', 'pending_final_closure'] as string[]).includes(incidentData?.status as string) && canApprove && (
            <IncidentClosureApprovalCard
              incidentId={selectedIncidentId}
              incidentTitle={incidentData?.title || ''}
              incidentStatus={(incidentData?.status as string) || ''}
              requestedBy={incidentData?.closure_requested_by || null}
              requestedAt={incidentData?.closure_requested_at || null}
              requestNotes={incidentData?.closure_request_notes || null}
              requesterName={(selectedIncident as { closure_requester?: { full_name?: string | null } })?.closure_requester?.full_name || undefined}
            />
          )}

          {/* Closure Request Button - show if eligible and not already requested */}
          {closureEligibility?.can_close && !incidentData?.closure_requested_at && incidentData?.status !== 'closed' && (
            <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200">
                      {t('investigation.closure.readyToClose', 'Ready for Closure')}
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {t('investigation.closure.allActionsVerified', 'All corrective actions have been verified.')}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowClosureDialog(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Lock className="h-4 w-4 me-2" />
                    {t('investigation.closure.requestClosure', 'Request Closure')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit Log */}
          <AuditLogPanel incidentId={selectedIncidentId} />

          {/* Closure Dialog */}
          <IncidentClosureRequestDialog
            open={showClosureDialog}
            onOpenChange={setShowClosureDialog}
            incidentId={selectedIncidentId || ''}
          />

          {/* Reopen Dialog */}
          <ReopenIncidentDialog
            open={showReopenDialog}
            onOpenChange={setShowReopenDialog}
            incidentId={selectedIncidentId || ''}
            incidentTitle={incidentData?.title}
            onSuccess={handleRefresh}
          />

          {/* Close On Spot Dialog */}
          <CloseObservationOnSpotDialog
            open={showCloseOnSpotDialog}
            onOpenChange={setShowCloseOnSpotDialog}
            incidentId={selectedIncidentId || ''}
            incidentTitle={incidentData?.title}
          />
        </>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t('investigation.selectToStart', 'Select an incident to begin')}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t('investigation.selectToStartDescription', 'Choose an incident from the dropdown above to view its details and start or continue the investigation process.')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
