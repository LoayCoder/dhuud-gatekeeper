import { useInvestigationWorkspaceData } from "./InvestigationWorkspace/hooks/useInvestigationWorkspaceData";
// Investigation Workspace - Main page for incident investigation
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, Clock, FileSearch, ClipboardCheck, RefreshCw, Search, Lock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIncidents, useIncident } from '@/features/incidents';
import { useInvestigation, useCorrectiveActions } from '@/features/investigation';
import { useIncidentClosureEligibility, useIncidentClosureApproval } from '@/features/incidents';
import { useCanApproveInvestigation } from '@/features/incidents';
import { usePendingIncidentApprovals } from "@/hooks/use-pending-approvals";
import { useInvestigationEditAccess } from '@/features/investigation';
import { useUserRoles } from '@/features/users';
import {
  AuditLogPanel,
  IncidentClosureRequestDialog,
  IncidentClosureApprovalCard,
  CurrentOwnerCard,
  UnifiedTimelineTracker,
  EscalationAlertBanner,
  IncidentClosurePrerequisitesCard,
} from '@/features/investigation';
import { CloseObservationOnSpotDialog } from '@/features/investigation';
import { ReopenIncidentDialog } from '@/features/investigation';
import { useIsAssignedClinicUser } from "@/hooks/use-injury-assignment";
import { useIsAssignedTechEvaluator } from "@/hooks/use-property-damage-assignment";
import { useIsAssignedEnvironmentalExpert } from "@/hooks/use-environmental-assignment";
import { ResponsibleUserBadge } from '@/features/incidents';
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getStatusBorderColor, getStatusCategory } from "@/lib/incident-status-colors";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SeverityLevelV2 } from "@/lib/hsse-severity-levels";
import { InvestigationListView } from '@/features/investigation';
import { calculateInvestigationSLA } from "@/lib/investigation-sla";
import { InvestigationWorkflowCards } from "./InvestigationWorkspace/components/InvestigationWorkflowCards";
import { InvestigationTabsContent } from "./InvestigationWorkspace/components/InvestigationTabsContent";
import { InvestigationWorkspaceHeader } from "./InvestigationWorkspace/components/InvestigationWorkspaceHeader";
import { InvestigationWorkspaceBanners } from "./InvestigationWorkspace/components/InvestigationWorkspaceBanners";

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

  const {
    actionsCount, incidents, loadingIncidents, pendingApprovals, loadingPending,
    selectedIncident, refetchIncident, investigation, refetchInvestigation,
    closureEligibility, approveClosureMutation, rejectClosureMutation, canApprove,
    workflowActors, investigatorInfo, editAccess, isInvestigator, canAccessGovernance,
    isAssignedClinicUser, isAssignedTechEvaluator, isAssignedEnvironmentalExpert,
    canReviewSpecialistData, incidentData, status, investigationAllowed, handleRefresh,
    queryClient
  } = useInvestigationWorkspaceData(selectedIncidentId);


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
  const renderWorkflowCards = () => (
    <InvestigationWorkflowCards
      incidentData={incidentData}
      investigation={investigation}
      actionsCount={actionsCount}
      handleCreateAction={handleCreateAction}
      handleRefresh={handleRefresh}
    />
  );

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
    slaInfo = calculateInvestigationSLA(incidentData.created_at || new Date().toISOString(), incidentData.severity_v2 || (incidentData as unknown).severity);
  }

  return (
    <div className="container max-w-7xl py-8 space-y-8 overflow-x-hidden" dir={direction}>
      {/* Modern Executive Header */}
      <InvestigationWorkspaceHeader
        selectedIncidentId={selectedIncidentId}
        selectedIncident={selectedIncident}
        incidentData={incidentData}
        slaInfo={slaInfo}
        onBack={() => {
          setSelectedIncidentId(null);
          navigate('/incidents/investigate');
        }}
        onRefresh={handleRefresh}
        onCloseOnSpot={() => setShowCloseOnSpotDialog(true)}
      />

      {/* Filter Card is now in InvestigationListView */}

      {/* Current Owner & Status Bar - Only when incident selected */}
      {selectedIncidentId && selectedIncident && (
        <CurrentOwnerCard incident={selectedIncident as unknown} />
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
          <div data-workflow-card>
            {renderWorkflowCards()}
          </div>

          {/* Closure Prerequisites Card - Show during final closure stages */}
          {status && ['pending_final_closure', 'pending_hsse_incident_validation'].includes(status) && (
            <IncidentClosurePrerequisitesCard incidentId={selectedIncidentId} />
          )}

          {/* Removed legacy observation workflow tracker */}

          <InvestigationWorkspaceBanners
            investigationAllowed={investigationAllowed}
            editAccess={editAccess}
            setShowReopenDialog={setShowReopenDialog}
          />

          {/* Investigation Sections - Modern Single-Page Layout */}
          <InvestigationTabsContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isTabLocked={isTabLocked}
            selectedIncidentId={selectedIncidentId!}
            selectedIncident={selectedIncident}
            investigation={investigation}
            handleRefresh={handleRefresh}
            canApprove={canApprove}
            startInvestigation={startInvestigation}
            unlockedTabs={unlockedTabs}
            completedTabs={completedTabs}
            investigationAllowed={investigationAllowed}
            editAccess={editAccess}
            showActionDialog={showActionDialog}
            setShowActionDialog={setShowActionDialog}
            incidentData={incidentData}
            isAssignedClinicUser={isAssignedClinicUser}
            canReviewSpecialistData={canReviewSpecialistData}
            isAssignedTechEvaluator={isAssignedTechEvaluator}
            isAssignedEnvironmentalExpert={isAssignedEnvironmentalExpert}
            canAccessGovernance={canAccessGovernance}
            status={status}
          />

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




