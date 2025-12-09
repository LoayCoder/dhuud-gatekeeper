import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, FileSearch, Users, Search, ListChecks, LayoutDashboard, Lock, AlertCircle, ClipboardCheck, List } from "lucide-react";
import { useIncidents, useIncident } from "@/hooks/use-incidents";
import { useInvestigation } from "@/hooks/use-investigation";
import { useIncidentClosureEligibility, useIncidentClosureApproval } from "@/hooks/use-incident-closure";
import { usePendingIncidentApprovals } from "@/hooks/use-pending-approvals";
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
  DeptRepApprovalCard
} from "@/components/investigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function InvestigationWorkspace() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [searchParams] = useSearchParams();
  const urlIncidentId = searchParams.get('incident');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(urlIncidentId);
  const [activeTab, setActiveTab] = useState("overview");
  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'my-pending' | 'all'>('my-pending');
  const { profile, user } = useAuth();

  const { data: incidents, isLoading: loadingIncidents } = useIncidents();
  const { data: pendingApprovals, isLoading: loadingPending } = usePendingIncidentApprovals();
  const { data: selectedIncident, refetch: refetchIncident } = useIncident(selectedIncidentId || undefined);
  const { data: investigation, refetch: refetchInvestigation } = useInvestigation(selectedIncidentId);
  const { data: closureEligibility } = useIncidentClosureEligibility(selectedIncidentId);
  const { approveClosureMutation, rejectClosureMutation } = useIncidentClosureApproval(selectedIncidentId || '');

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

  // Check if user can approve closure (different user than requester)
  const canApprove = user?.id && incidentData?.closure_requested_by && user.id !== incidentData.closure_requested_by;

  // Determine if investigation tabs should be enabled
  // Cast to string to handle new enum values not yet in types
  const status = incidentData?.status as string | undefined;
  const investigationAllowed = status && ['investigation_in_progress', 'pending_closure', 'closed'].includes(status);

  // Filter incidents that need investigation (not closed status)
  const investigableIncidents = incidents?.filter(
    (inc) => inc.status !== 'closed'
  );

  // Choose displayed incidents based on view mode
  const displayedIncidents = viewMode === 'my-pending' ? pendingApprovals : investigableIncidents;
  const isLoadingIncidents = viewMode === 'my-pending' ? loadingPending : loadingIncidents;

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'investigation_in_progress':
      case 'under_investigation':
        return 'default';
      case 'submitted':
        return 'secondary';
      case 'investigation_pending':
        return 'outline';
      case 'closed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

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
        return (
          <DeptRepApprovalCard 
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

      case 'investigation_pending':
        return (
          <InvestigatorAssignmentStep 
            incident={incidentData} 
            onComplete={handleRefresh} 
          />
        );

      default:
        return null;
    }
  };

  // Locked tab trigger wrapper
  const LockedTabTrigger = ({ value, icon: Icon, label }: { value: string; icon: React.ElementType; label: string }) => {
    if (investigationAllowed) {
      return (
        <TabsTrigger value={value} className="flex items-center gap-2">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('investigation.title', 'Investigation Workspace')}
        </h1>
        <p className="text-muted-foreground">
          {t('investigation.description', 'Investigate incidents, collect evidence, and track corrective actions')}
        </p>
      </div>

      {/* Incident Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">
              {t('investigation.selectIncident', 'Select Incident to Investigate')}
            </CardTitle>
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as 'my-pending' | 'all')}
              className="justify-start"
            >
              <ToggleGroupItem value="my-pending" className="gap-2 text-sm">
                <ClipboardCheck className="h-4 w-4" />
                <span className="hidden sm:inline">{t('investigation.myPendingApprovals', 'My Pending Approvals')}</span>
                <span className="sm:hidden">{t('investigation.myPending', 'My Pending')}</span>
                {pendingApprovals && pendingApprovals.length > 0 && (
                  <Badge variant="destructive" className="ms-1 h-5 min-w-5 px-1.5">
                    {pendingApprovals.length}
                  </Badge>
                )}
              </ToggleGroupItem>
              <ToggleGroupItem value="all" className="gap-2 text-sm">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">{t('investigation.allIncidents', 'All Incidents')}</span>
                <span className="sm:hidden">{t('investigation.all', 'All')}</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingIncidents ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading', 'Loading...')}
            </div>
          ) : (
            <Select
              value={selectedIncidentId || ''}
              onValueChange={(value) => setSelectedIncidentId(value)}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder={t('investigation.selectIncidentPlaceholder', 'Choose an incident...')} />
              </SelectTrigger>
              <SelectContent dir={direction}>
                {displayedIncidents?.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {viewMode === 'my-pending' 
                      ? t('investigation.noPendingApprovals', 'No incidents pending your approval')
                      : t('investigation.noIncidents', 'No incidents available for investigation')}
                  </div>
                ) : (
                  displayedIncidents?.map((incident) => (
                    <SelectItem key={incident.id} value={incident.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{incident.reference_id}</span>
                        <span className="truncate max-w-[200px]">{incident.title}</span>
                        <Badge variant={getStatusVariant(incident.status)} className="ms-auto">
                          {incident.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
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
            <Card className="border-warning bg-warning/10">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium text-warning">
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

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
            <TabsList className="flex flex-wrap h-auto gap-1 w-full">
              <TabsTrigger value="overview" className="flex items-center gap-2">
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

            {investigationAllowed && (
              <>
                <TabsContent value="evidence" className="mt-4">
                  <EvidencePanel incidentId={selectedIncidentId} incidentStatus={selectedIncident?.status} />
                </TabsContent>

                <TabsContent value="witnesses" className="mt-4">
                  <WitnessPanel incidentId={selectedIncidentId} incident={selectedIncident} />
                </TabsContent>

                <TabsContent value="rca" className="mt-4">
                  <RCAPanel incidentId={selectedIncidentId} />
                </TabsContent>

                <TabsContent value="actions" className="mt-4">
                  <ActionsPanel incidentId={selectedIncidentId} />
                </TabsContent>
              </>
            )}
          </Tabs>

          {/* Closure Approval Card - show if closure is pending */}
          {incidentData?.closure_requested_at && !incidentData?.closure_approved_at && canApprove && (
            <IncidentClosureApprovalCard
              incidentId={selectedIncidentId}
              incidentTitle={incidentData?.title || ''}
              requestedBy={incidentData?.closure_requested_by || null}
              requestedAt={incidentData?.closure_requested_at || null}
              requestNotes={incidentData?.closure_request_notes || null}
            />
          )}

          {/* Closure Request Button - show if eligible and not already requested */}
          {closureEligibility?.can_close && !incidentData?.closure_requested_at && incidentData?.status !== 'closed' && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{t('investigation.closure.readyToClose', 'Ready for Closure')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('investigation.closure.allActionsVerified', 'All corrective actions have been verified.')}
                    </p>
                  </div>
                  <Button onClick={() => setShowClosureDialog(true)}>
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
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {t('investigation.selectToStart', 'Select an incident above to begin investigation')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
