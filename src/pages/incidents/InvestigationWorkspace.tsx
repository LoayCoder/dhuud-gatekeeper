// Investigation Workspace - Main page for incident investigation
import { useState } from "react";
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
  ArrowLeft,
  UserCheck
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIncidents, useIncident } from "@/hooks/use-incidents";
import { useInvestigation } from "@/hooks/use-investigation";
import { useIncidentClosureEligibility, useIncidentClosureApproval } from "@/hooks/use-incident-closure";
import { useCanApproveInvestigation } from "@/hooks/use-hsse-workflow";
import { usePendingIncidentApprovals } from "@/hooks/use-pending-approvals";
import { useInvestigationEditAccess } from "@/hooks/use-investigation-edit-access";
import { 
  EvidencePanel, 
  WitnessPanel, 
  RCAPanel, 
  ActionsPanel, 
  AuditLogPanel, 
  OverviewPanel, 
  IncidentClosureRequestDialog, 
  IncidentClosureApprovalCard,
  WorkflowProgressBanner,
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
  HSSEEscalationReviewCard
} from "@/components/investigation";
import { ReopenIncidentDialog } from "@/components/investigation/ReopenIncidentDialog";
import { IncidentStatusBadge } from "@/components/incidents/IncidentStatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getStatusBorderColor, getStatusCategory } from "@/lib/incident-status-colors";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function InvestigationWorkspace() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlIncidentId = searchParams.get('incident');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(urlIncidentId);
  const [activeTab, setActiveTab] = useState("overview");
  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'my-pending' | 'all'>('my-pending');
  const { profile, user } = useAuth();

  const { data: incidents, isLoading: loadingIncidents } = useIncidents();
  const { data: pendingApprovals, isLoading: loadingPending } = usePendingIncidentApprovals();
  const { data: selectedIncident, refetch: refetchIncident } = useIncident(selectedIncidentId || undefined);
  const { data: investigation, refetch: refetchInvestigation } = useInvestigation(selectedIncidentId);
  const { data: closureEligibility } = useIncidentClosureEligibility(selectedIncidentId);
  const { approveClosureMutation, rejectClosureMutation } = useIncidentClosureApproval(selectedIncidentId || '');

  // Fetch investigator name for current owner display
  const { data: investigatorInfo } = useQuery({
    queryKey: ['investigator-info', investigation?.investigator_id],
    queryFn: async () => {
      if (!investigation?.investigator_id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', investigation.investigator_id)
        .single();
      return data;
    },
    enabled: !!investigation?.investigator_id
  });
  
  // Investigation edit access control
  const editAccess = useInvestigationEditAccess(investigation, selectedIncident);

  const handleRefresh = () => {
    refetchIncident();
    refetchInvestigation();
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
  } | undefined;

  // Check if user can approve closure using RPC function (enforces role-based and conflict-of-interest checks)
  const { data: canApprove = false } = useCanApproveInvestigation(selectedIncidentId);

  // Determine if investigation tabs should be enabled
  // Cast to string to handle new enum values not yet in types
  const status = incidentData?.status as string | undefined;
  const investigationAllowed = status && ['investigation_in_progress', 'pending_closure', 'pending_final_closure', 'investigation_closed', 'closed'].includes(status);

  // Filter incidents that need investigation (not closed status)
  const investigableIncidents = incidents?.filter(
    (inc) => inc.status !== 'closed'
  );

  // Choose displayed incidents based on view mode
  const displayedIncidents = viewMode === 'my-pending' ? pendingApprovals : investigableIncidents;
  const isLoadingIncidents = viewMode === 'my-pending' ? loadingPending : loadingIncidents;

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
            onEdit={() => {/* TODO: Navigate to edit form */}}
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
        return (
          <InvestigatorAssignmentStep 
            incident={incidentData} 
            onComplete={handleRefresh} 
          />
        );

      case 'upgraded_to_incident':
        // Show info that observation was upgraded - could show link to new incident
        return null;

      default:
        return null;
    }
  };

  // Locked tab trigger wrapper
  const LockedTabTrigger = ({ value, icon: Icon, label }: { value: string; icon: React.ElementType; label: string }) => {
    if (investigationAllowed) {
      return (
        <TabsTrigger value={value} className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </TabsTrigger>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground opacity-50 cursor-not-allowed">
              <Lock className="h-3 w-3" />
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('investigation.workflow.tabsLockedMessage', 'Complete the approval workflow to unlock investigation tabs')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Get current owner based on incident status
  const getCurrentOwner = () => {
    if (!selectedIncident) return null;
    const status = selectedIncident.status as string;
    
    // Status-to-owner mapping
    if (status === 'submitted' || status === 'pending_review' || status === 'expert_screening') {
      return { role: t('incidents.workflowOwners.hsse_expert', 'HSSE Expert'), name: null };
    }
    if (status === 'pending_manager_approval' || status === 'hsse_manager_escalation') {
      return { role: t('incidents.workflowOwners.department_manager', 'Department Manager'), name: null };
    }
    if (status === 'pending_dept_rep_approval') {
      return { role: t('incidents.workflowOwners.department_rep', 'Department Representative'), name: null };
    }
    if (status === 'investigation_in_progress' || status === 'investigation_pending') {
      return { 
        role: t('incidents.workflowOwners.investigator', 'Investigator'), 
        name: investigatorInfo?.full_name || null 
      };
    }
    if (status === 'pending_closure' || status === 'pending_final_closure' || status === 'observation_actions_pending') {
      return { role: t('incidents.workflowOwners.hsse_manager', 'HSSE Manager'), name: null };
    }
    if (status === 'closed' || status === 'no_investigation_required' || status === 'investigation_closed') {
      return null; // No owner when closed
    }
    return { role: t('incidents.workflowOwners.awaiting_assignment', 'Awaiting Assignment'), name: null };
  };

  const currentOwner = getCurrentOwner();

  return (
    <div className="container py-6 space-y-6 overflow-x-hidden" dir={direction}>
      {/* Modern Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Back to Event List Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/incidents')}
            className="gap-2 me-2 shrink-0"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('incidents.backToList', 'Back to Event List')}</span>
          </Button>
          <div className="p-2 rounded-lg bg-primary/10">
            <FileSearch className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t('investigation.title', 'Investigation Workspace')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('investigation.description', 'Investigate incidents, collect evidence, and track corrective actions')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
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

      {/* Current Owner Banner */}
      {selectedIncidentId && currentOwner && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <UserCheck className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {t('incidents.currentOwner', 'Current Owner')}
                </p>
                <p className="font-medium">
                  {currentOwner.name ? `${currentOwner.name} (${currentOwner.role})` : currentOwner.role}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incident Selector Card - Enhanced Design */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                {t('investigation.selectIncident', 'Select Incident to Investigate')}
              </CardTitle>
              <CardDescription className="mt-1">
                {viewMode === 'my-pending' 
                  ? t('investigation.showingPendingApprovals', 'Showing incidents pending your action')
                  : t('investigation.showingAllIncidents', 'Showing all open incidents')}
              </CardDescription>
            </div>
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as 'my-pending' | 'all')}
              className="justify-start bg-muted p-1 rounded-lg"
            >
              <ToggleGroupItem 
                value="my-pending" 
                className="gap-2 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
              >
                <ClipboardCheck className="h-4 w-4" />
                <span className="hidden sm:inline">{t('investigation.myPendingApprovals', 'My Pending')}</span>
                <span className="sm:hidden">{t('investigation.myPending', 'My Pending')}</span>
                {pendingApprovals && pendingApprovals.length > 0 && (
                  <Badge variant="destructive" className="ms-1 h-5 min-w-5 px-1.5 text-xs">
                    {pendingApprovals.length}
                  </Badge>
                )}
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="all" 
                className="gap-2 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">{t('investigation.allIncidents', 'All Incidents')}</span>
                <span className="sm:hidden">{t('investigation.all', 'All')}</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingIncidents ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading', 'Loading...')}
            </div>
          ) : (
            <Select
              value={selectedIncidentId || ''}
              onValueChange={(value) => setSelectedIncidentId(value)}
            >
              <SelectTrigger className="w-full md:w-[500px] h-12">
                <SelectValue placeholder={t('investigation.selectIncidentPlaceholder', 'Choose an incident...')} />
              </SelectTrigger>
              <SelectContent dir={direction} className="max-h-[400px]">
                {displayedIncidents?.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    {viewMode === 'my-pending' 
                      ? t('investigation.noPendingApprovals', 'No incidents pending your approval')
                      : t('investigation.noIncidents', 'No incidents available for investigation')}
                  </div>
                ) : (
                  displayedIncidents?.map((incident) => {
                    const statusCategory = getStatusCategory(incident.status);
                    return (
                      <SelectItem 
                        key={incident.id} 
                        value={incident.id}
                        className={cn(
                          "py-3 cursor-pointer",
                          "border-s-4 ps-3",
                          getStatusBorderColor(incident.status)
                        )}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                {incident.reference_id}
                              </span>
                              <span className="truncate font-medium">
                                {incident.title}
                              </span>
                            </div>
                          </div>
                          <IncidentStatusBadge status={incident.status || ''} className="text-xs shrink-0" />
                        </div>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Investigation Content */}
      {selectedIncidentId && incidentData ? (
        <>
          {/* Workflow Progress Banner */}
          <WorkflowProgressBanner incident={incidentData} />

          {/* Workflow-Specific Cards */}
          {renderWorkflowCards()}

          {/* Warning if investigation not yet allowed */}
          {!investigationAllowed && (
            <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      {t('investigation.workflow.pendingApproval', 'Pending Approval')}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {t('investigation.workflow.completeWorkflowFirst', 'Complete the approval workflow above before accessing investigation tools.')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Read-only oversight banner */}
          {investigationAllowed && editAccess.isReadOnly && !editAccess.isClosed && (
            <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
              <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                {editAccess.isOversightRole 
                  ? t('investigation.readOnly.oversightBanner', 'You have read-only access to monitor this investigation. Only the assigned investigator can make changes.')
                  : t('investigation.readOnly.notAssigned', 'You are not the assigned investigator. Investigation data is read-only.')}
              </AlertDescription>
            </Alert>
          )}

          {/* Closed incident banner with reopen option */}
          {editAccess.isClosed && (
            <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <Lock className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="flex items-center justify-between text-green-800 dark:text-green-200">
                <span>{t('investigation.readOnly.closedBanner', 'This incident is closed and all data is locked.')}</span>
                {editAccess.canReopen && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowReopenDialog(true)}
                    className="ms-4 border-green-500/50 hover:bg-green-100 dark:hover:bg-green-900/50"
                  >
                    <RotateCcw className="h-4 w-4 me-2" />
                    {t('investigation.reopen.button', 'Reopen Investigation')}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs - Enhanced Design */}
          <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction} className="w-full overflow-hidden">
            <TabsList className="flex flex-wrap h-auto gap-1 w-full bg-muted/50 p-1 rounded-lg">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">{t('investigation.tabs.overview', 'Overview')}</span>
              </TabsTrigger>
              
              <LockedTabTrigger 
                value="evidence" 
                icon={FileSearch} 
                label={t('investigation.tabs.evidence', 'Evidence')} 
              />
              <LockedTabTrigger 
                value="witnesses" 
                icon={Users} 
                label={t('investigation.tabs.witnesses', 'Witnesses')} 
              />
              <LockedTabTrigger 
                value="rca" 
                icon={Search} 
                label={t('investigation.tabs.rca', 'RCA')} 
              />
              <LockedTabTrigger 
                value="actions" 
                icon={ListChecks} 
                label={t('investigation.tabs.actions', 'Actions')} 
              />
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <OverviewPanel 
                incident={selectedIncident} 
                investigation={investigation ?? null}
                onRefresh={handleRefresh}
              />
            </TabsContent>

            <TabsContent value="evidence" className="mt-4">
              {investigationAllowed ? (
                <EvidencePanel 
                  incidentId={selectedIncidentId} 
                  incidentStatus={selectedIncident?.status}
                  canEdit={editAccess.canEdit}
                />
              ) : null}
            </TabsContent>

            <TabsContent value="witnesses" className="mt-4">
              {investigationAllowed ? (
                <WitnessPanel 
                  incidentId={selectedIncidentId} 
                  incident={selectedIncident} 
                  incidentStatus={selectedIncident?.status}
                  canEdit={editAccess.canEdit}
                />
              ) : null}
            </TabsContent>

            <TabsContent value="rca" className="mt-4">
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

            <TabsContent value="actions" className="mt-4 space-y-4">
              {investigationAllowed ? (
                <>
                  {/* Cause Coverage Indicator */}
                  <CauseCoverageIndicator incidentId={selectedIncidentId} />
                  
                  {/* Actions List */}
                  <ActionsPanel 
                    incidentId={selectedIncidentId} 
                    incidentStatus={selectedIncident?.status}
                    canEdit={editAccess.canEdit}
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
          </Tabs>

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
