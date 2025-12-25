import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, MessageSquare, Loader2, ShieldCheck, AlertTriangle, FileCheck, PlayCircle, RotateCcw, CalendarPlus, HardHat, Truck, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyCorrectiveActions, useUpdateMyActionStatus } from '@/hooks/use-incidents';
import { useMyAssignedWitnessStatements } from '@/hooks/use-witness-statements';
import { usePendingActionApprovals, usePendingSeverityApprovals, usePendingIncidentApprovals, useCanAccessApprovals, type PendingActionApproval } from '@/hooks/use-pending-approvals';
import { usePendingClosureRequests } from '@/hooks/use-incident-closure';
import { useUserRoles } from '@/hooks/use-user-roles';
import { usePendingExtensionRequests } from '@/hooks/use-action-extensions';
import { useUploadActionEvidence } from '@/hooks/use-action-evidence';
import { useMyInspectionActions } from '@/hooks/use-inspection-actions';
import { usePendingWorkerApprovals } from '@/hooks/contractor-management/use-contractor-workers';
import { usePendingGatePassApprovals } from '@/hooks/contractor-management/use-material-gate-passes';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { WitnessDirectEntry } from '@/components/investigation/WitnessDirectEntry';
import { ActionVerificationDialog } from '@/components/investigation/ActionVerificationDialog';
import { SeverityApprovalCard } from '@/components/investigation/SeverityApprovalCard';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionProgressDialog, ExtensionRequestDialog, ExtensionApprovalCard, ActionWorkflowTimeline } from '@/components/actions';

const getStatusIcon = (status: string | null) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
    case 'verified': return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case 'approved': return <CheckCircle2 className="h-4 w-4 text-primary" />;
    default: return <AlertCircle className="h-4 w-4 text-amber-500" />;
  }
};

const getPriorityBadgeVariant = (priority: string | null): "destructive" | "secondary" | "outline" => {
  switch (priority) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

// Type for action dialog
interface ActionForDialog {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  due_date?: string | null;
  priority?: string | null;
  incident_id?: string | null;
}

export default function MyActions() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  const { data: incidentActions, isLoading: actionsLoading } = useMyCorrectiveActions();
  const { data: inspectionActions, isLoading: inspectionActionsLoading } = useMyInspectionActions();
  const { data: witnessStatements, isLoading: witnessLoading, refetch: refetchWitness } = useMyAssignedWitnessStatements();
  
  const updateStatus = useUpdateMyActionStatus();
  const uploadEvidence = useUploadActionEvidence();
  const [selectedWitnessTask, setSelectedWitnessTask] = useState<{ id: string; incident_id: string } | null>(null);
  const [activeTab, setActiveTab] = useState('actions');
  
  // Action progress dialog states
  const [actionDialogAction, setActionDialogAction] = useState<ActionForDialog | null>(null);
  const [actionDialogMode, setActionDialogMode] = useState<'start' | 'complete'>('start');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  
  // Extension request dialog state
  const [extensionRequestAction, setExtensionRequestAction] = useState<ActionForDialog | null>(null);
  
  // Track which actions are currently being submitted to prevent duplicate submissions
  const [submittingActionIds, setSubmittingActionIds] = useState<Set<string>>(new Set());

  // Pending approvals data
  const { canAccess: canAccessApprovals, canApproveSeverity, canVerifyActions } = useCanAccessApprovals();
  const { hasRole } = useUserRoles();
  const { data: pendingApprovals, isLoading: approvalsLoading } = usePendingActionApprovals();
  const { data: pendingSeverity, isLoading: severityLoading } = usePendingSeverityApprovals();
  const { data: pendingIncidentApprovals, isLoading: incidentApprovalsLoading } = usePendingIncidentApprovals();
  const { data: pendingClosures, isLoading: closuresLoading } = usePendingClosureRequests();
  const { data: pendingExtensions, isLoading: extensionsLoading } = usePendingExtensionRequests();
  const [selectedActionForVerification, setSelectedActionForVerification] = useState<PendingActionApproval | null>(null);
  
  // Contractor approvals - must be after hasRole is declared
  const { data: pendingWorkers, isLoading: workersLoading } = usePendingWorkerApprovals();
  const { data: pendingGatePasses, isLoading: gatePassesLoading } = usePendingGatePassApprovals();
  const canApproveWorkers = hasRole('admin') || hasRole('security_supervisor') || hasRole('security_manager');
  const canApproveGatePasses = hasRole('admin') || hasRole('security_supervisor') || hasRole('project_manager');
  
  // Check if user can approve closures (HSSE Manager or Admin)
  const canApproveClosures = hasRole('admin') || hasRole('hsse_manager');
  const isHSSEManager = hasRole('hsse_manager');
  
  // Combine incident and inspection actions into a unified list with source indicator
  const allActions = [
    ...(incidentActions || []).map(a => ({ ...a, source: 'incident' as const })),
    ...(inspectionActions || []).map(a => ({ ...a, source: 'inspection' as const })),
  ];

  // Handle opening action dialog for "Start Work"
  const handleStartWork = (action: ActionForDialog) => {
    // Prevent re-opening dialog for actions already being submitted
    if (submittingActionIds.has(action.id)) return;
    setActionDialogAction(action);
    setActionDialogMode('start');
    setActionDialogOpen(true);
  };

  // Handle opening action dialog for "Mark Completed"
  const handleMarkCompleted = (action: ActionForDialog) => {
    // Prevent re-opening dialog for actions already being submitted
    if (submittingActionIds.has(action.id)) return;
    setActionDialogAction(action);
    setActionDialogMode('complete');
    setActionDialogOpen(true);
  };

  // Handle action dialog confirmation
  const handleActionDialogConfirm = async (data: { notes: string; overdueJustification?: string; files: File[] }) => {
    if (!actionDialogAction) return;
    
    const actionId = actionDialogAction.id;
    const incidentId = actionDialogAction.incident_id;
    const mode = actionDialogMode;
    
    // Add to submitting set and close dialog immediately to prevent re-submission
    setSubmittingActionIds(prev => new Set(prev).add(actionId));
    setActionDialogOpen(false);
    setActionDialogAction(null);
    
    try {
      // Upload files first if any
      for (const file of data.files) {
        if (incidentId) {
          await uploadEvidence.mutateAsync({
            actionId: actionId,
            incidentId: incidentId,
            file,
          });
        }
      }

      // Update action status
      await updateStatus.mutateAsync({
        id: actionId,
        status: mode === 'start' ? 'in_progress' : 'completed',
        progressNotes: mode === 'start' ? data.notes : undefined,
        completionNotes: mode === 'complete' ? data.notes : undefined,
        overdueJustification: data.overdueJustification,
      });
    } catch (error) {
      // Error is handled by the mutation hooks
    } finally {
      // Remove from submitting set after completion (success or failure)
      setSubmittingActionIds(prev => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };

  // Handle extension request
  const handleRequestExtension = (action: ActionForDialog) => {
    setExtensionRequestAction(action);
  };

  const handleWitnessStatementSubmit = () => {
    setSelectedWitnessTask(null);
    refetchWitness();
  };

  const pendingActions = allActions?.filter(a => a.status === 'assigned' || a.status === 'pending' || a.status === 'returned_for_correction') || [];
  const inProgressActions = allActions?.filter(a => a.status === 'in_progress') || [];
  const completedActions = allActions?.filter(a => a.status === 'completed' || a.status === 'verified') || [];

  const pendingWitness = witnessStatements?.filter(w => w.assignment_status === 'pending' || w.assignment_status === 'in_progress') || [];

  const totalExtensions = pendingExtensions?.length || 0;
  const contractorApprovalCount = (canApproveWorkers ? (pendingWorkers?.length || 0) : 0) + (canApproveGatePasses ? (pendingGatePasses?.length || 0) : 0);
  const totalPendingApprovals = (canVerifyActions ? (pendingApprovals?.length || 0) : 0) + (canApproveSeverity ? (pendingSeverity?.length || 0) : 0) + (pendingIncidentApprovals?.length || 0) + (canApproveClosures ? (pendingClosures?.length || 0) : 0) + totalExtensions + contractorApprovalCount;

  const isLoading = actionsLoading || inspectionActionsLoading || witnessLoading;

  return (
    <div className="container py-6 space-y-6" dir={direction}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('investigation.myActions', 'My Actions')}</h1>
          <p className="text-muted-foreground">{t('investigation.myActionsDescription', 'View and manage your assigned tasks')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`grid gap-4 ${canAccessApprovals ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('investigation.pendingActions', 'Pending Actions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingActions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('investigation.inProgressActions', 'In Progress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{inProgressActions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('investigation.completedActions', 'Completed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{completedActions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('investigation.witnesses.pendingStatements', 'Pending Statements')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{pendingWitness.length}</div>
          </CardContent>
        </Card>
        {canAccessApprovals && (
          <Card className={totalPendingApprovals > 0 ? 'border-amber-200 dark:border-amber-900' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('investigation.approvals.pendingApprovals', 'Pending Approvals')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalPendingApprovals > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {totalPendingApprovals}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
        <TabsList>
          <TabsTrigger value="actions">
            <ClipboardList className="h-4 w-4 me-2" />
            {t('investigation.correctiveActions', 'Corrective Actions')} ({allActions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="witness">
            <MessageSquare className="h-4 w-4 me-2" />
            {t('investigation.witnesses.title', 'Witness Statements')} ({witnessStatements?.length || 0})
          </TabsTrigger>
          {canAccessApprovals && (
            <TabsTrigger value="approvals" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              {t('investigation.approvals.pendingApprovals', 'Pending Approvals')}
              {totalPendingApprovals > 0 && (
                <Badge variant="secondary" className="ms-1">
                  {totalPendingApprovals}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="actions" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : allActions && allActions.length > 0 ? (
            <div className="space-y-4">
              {allActions.map((action) => {
                const isIncidentAction = action.source === 'incident';
                const returnCount = isIncidentAction && 'return_count' in action ? (action.return_count || 0) : 0;
                const lastReturnReason = isIncidentAction && 'last_return_reason' in action ? action.last_return_reason : null;
                const rejectionNotes = isIncidentAction && 'rejection_notes' in action ? action.rejection_notes : null;
                const rejectedByProfile = isIncidentAction && 'rejected_by_profile' in action ? action.rejected_by_profile : null;
                const rejectedAt = isIncidentAction && 'rejected_at' in action ? action.rejected_at : null;
                const incidentId = isIncidentAction && 'incident_id' in action ? action.incident_id : null;
                const sessionId = !isIncidentAction && 'session_id' in action ? action.session_id : null;
                
                return (
                <Card key={action.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusIcon(action.status)}
                        {action.reference_id && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {action.reference_id}
                          </Badge>
                        )}
                        {/* Source indicator */}
                        <Badge variant={isIncidentAction ? 'secondary' : 'outline'} className="text-xs">
                          {isIncidentAction 
                            ? t('investigation.source.incident', 'Incident')
                            : t('investigation.source.inspection', 'Inspection')
                          }
                        </Badge>
                        <CardTitle className="text-base">{action.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {action.priority && (
                          <Badge variant={getPriorityBadgeVariant(action.priority)}>
                            {t(`investigation.priority.${action.priority}`, action.priority)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Workflow Timeline - only for incident actions */}
                    {isIncidentAction && (
                      <ActionWorkflowTimeline 
                        currentStatus={action.status} 
                        returnCount={returnCount}
                        className="py-2 mb-2"
                      />
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {action.due_date && (
                        <div>
                          <span className="font-medium">{t('investigation.dueDate', 'Due Date')}:</span>{' '}
                          {new Date(action.due_date).toLocaleDateString()}
                        </div>
                      )}
                      {action.created_at && (
                        <div>
                          <span className="font-medium">{t('common.createdAt', 'Created')}:</span>{' '}
                          {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                    
                    {/* Show rejection notes if action was returned for correction (incident only) */}
                    {isIncidentAction && action.status === 'returned_for_correction' && (lastReturnReason || rejectionNotes) && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-1">
                        <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                          <RotateCcw className="h-4 w-4" />
                          {t('actions.rejectionReason', 'Rejection Reason')}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {lastReturnReason || rejectionNotes}
                        </p>
                        {rejectedByProfile && (
                          <p className="text-xs text-muted-foreground">
                            {t('actions.rejectedBy', 'Rejected by')}: {rejectedByProfile.full_name}
                            {rejectedAt && ` • ${formatDistanceToNow(new Date(rejectedAt), { addSuffix: true })}`}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Controlled Action Buttons - Enforces sequential workflow */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Show "Returned for Correction" banner */}
                      {action.status === 'returned_for_correction' && (
                        <Badge variant="destructive" className="gap-1">
                          <RotateCcw className="h-3 w-3" />
                          {t('actions.returnedForCorrection', 'Returned for Correction')}
                        </Badge>
                      )}
                      
                      {/* Processing indicator when action is being submitted */}
                      {submittingActionIds.has(action.id) && (
                        <Badge variant="outline" className="animate-pulse gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {t('common.processing', 'Processing...')}
                        </Badge>
                      )}
                      
                      {/* Show "Start Work" for assigned or returned actions */}
                      {(action.status === 'assigned' || action.status === 'returned_for_correction') && !submittingActionIds.has(action.id) && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStartWork(action)}
                          disabled={updateStatus.isPending || submittingActionIds.has(action.id)}
                        >
                          <PlayCircle className="h-4 w-4 me-2" />
                          {action.status === 'returned_for_correction' 
                            ? t('actions.resubmit', 'Resubmit')
                            : t('investigation.actions.startWork', 'Start Work')
                          }
                        </Button>
                      )}
                      
                      {/* Show "Mark Completed" for in_progress actions */}
                      {action.status === 'in_progress' && !submittingActionIds.has(action.id) && (
                        <>
                          <Button 
                            size="sm"
                            onClick={() => handleMarkCompleted(action)}
                            disabled={updateStatus.isPending || submittingActionIds.has(action.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 me-2" />
                            {t('investigation.actions.markCompleted', 'Mark Completed')}
                          </Button>
                          
                          {/* Extension request button if overdue (incident actions only) */}
                          {isIncidentAction && action.due_date && new Date(action.due_date) < new Date() && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleRequestExtension(action)}
                            >
                              <CalendarPlus className="h-4 w-4 me-2" />
                              {t('actions.requestExtension', 'Request Extension')}
                            </Button>
                          )}
                        </>
                      )}
                      
                      {/* Show status badge for completed/verified */}
                      {action.status === 'completed' && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          <Clock className="h-3 w-3 me-1" />
                          {t('investigation.actions.awaitingVerification', 'Awaiting Verification')}
                        </Badge>
                      )}
                      
                      {action.status === 'verified' && (
                        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 me-1" />
                          {t('investigation.actionStatus.verified', 'Verified')}
                        </Badge>
                      )}
                      
                      {/* Navigate to source - Investigation Workspace for incidents, Session for inspections */}
                      {isIncidentAction && incidentId ? (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/incidents/investigate?incident=${incidentId}&from=my-actions`} className="gap-2">
                            {t('investigation.viewInvestigation', 'View Investigation')}
                            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                          </Link>
                        </Button>
                      ) : sessionId ? (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/inspections/sessions/${sessionId}`} className="gap-2">
                            {t('inspections.viewSession', 'View Session')}
                            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              )})}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('investigation.noActionsAssigned', 'No Actions Assigned')}</h3>
                <p className="text-muted-foreground">{t('investigation.noActionsDescription', 'You have no pending corrective actions.')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="witness" className="mt-4">
          {witnessLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : witnessStatements && witnessStatements.length > 0 ? (
            <div className="space-y-4">
              {witnessStatements.map((statement) => (
                <Card key={statement.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(statement.assignment_status)}
                        <CardTitle className="text-base">
                          {t('investigation.witnesses.statementRequest', 'Witness Statement Request')}
                        </CardTitle>
                      </div>
                      <Badge variant={statement.assignment_status === 'pending' ? 'destructive' : 'secondary'}>
                        {t(`investigation.witnesses.status.${statement.assignment_status}`, statement.assignment_status || 'pending')}
                      </Badge>
                    </div>
                    <CardDescription>
                      {t('investigation.witnesses.assignedToProvide', 'You have been assigned to provide a witness statement for an incident.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {statement.created_at && (
                        <div>
                          <span className="font-medium">{t('common.createdAt', 'Created')}:</span>{' '}
                          {formatDistanceToNow(new Date(statement.created_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                    
                    {statement.assignment_status !== 'completed' && statement.assignment_status !== 'approved' && (
                      <Button onClick={() => setSelectedWitnessTask({ id: statement.id, incident_id: statement.incident_id })}>
                        {t('investigation.witnesses.provideStatement', 'Provide Statement')}
                      </Button>
                    )}

                    {statement.statement && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium mb-1">{t('investigation.witnesses.yourStatement', 'Your Statement')}:</p>
                        <p className="text-sm">{statement.statement}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('investigation.witnesses.noAssignedStatements', 'No Assigned Statements')}</h3>
                <p className="text-muted-foreground">{t('investigation.witnesses.noAssignedDescription', 'You have no pending witness statement requests.')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {canAccessApprovals && (
          <TabsContent value="approvals" className="mt-4 space-y-6">
            {(approvalsLoading || severityLoading || incidentApprovalsLoading || closuresLoading) ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {/* Pending Incident Approvals Section (Manager/HSSE) */}
                {pendingIncidentApprovals && pendingIncidentApprovals.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      {t('investigation.approvals.incidentApprovals', 'Incident Approvals')}
                      <Badge variant="secondary">{pendingIncidentApprovals.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingIncidentApprovals.map((incident) => (
                        <Card key={incident.id} className="hover:shadow-md transition-shadow border-amber-200 dark:border-amber-900">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                <CardTitle className="text-base">{incident.reference_id || incident.id.slice(0, 8)}</CardTitle>
                              </div>
                              <div className="flex items-center gap-2">
                                {incident.severity && (
                                  <Badge variant={incident.severity === 'critical' || incident.severity === 'high' ? 'destructive' : 'secondary'}>
                                    {t(`investigation.severity.${incident.severity}`, incident.severity)}
                                  </Badge>
                                )}
                                {incident.event_type && (
                                  <Badge variant="outline">
                                    {String(t(`incidents.eventCategories.${incident.event_type}`, incident.event_type))}
                                  </Badge>
                                )}
                                {(incident as any).incident_type && (
                                  <Badge variant="outline">
                                    {String(t(`incidents.incidentTypes.${(incident as any).incident_type}`, (incident as any).incident_type))}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <CardDescription>{incident.title}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              {incident.reporter && (
                                <div>
                                  <span className="font-medium">{t('investigation.reportedBy', 'Reported By')}:</span>{' '}
                                  {incident.reporter.full_name}
                                </div>
                              )}
                              {incident.created_at && (
                                <div>
                                  <span className="font-medium">{t('common.createdAt', 'Created')}:</span>{' '}
                                  {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                                </div>
                              )}
                            </div>
                            
                            <Button asChild size="sm">
                              <Link to={`/incidents/investigate?incident=${incident.id}&from=my-actions`} className="gap-2">
                                {t('investigation.approvals.reviewIncident', 'Review & Approve')}
                                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Closure Requests Section (HSSE Manager/Admin only) */}
                {canApproveClosures && pendingClosures && pendingClosures.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-amber-500" />
                      {t('dashboard.pendingClosures', 'Pending Closure Requests')}
                      <Badge variant="secondary">{pendingClosures.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingClosures.map((request) => {
                        const isFinalClosure = request.status === 'pending_final_closure';
                        return (
                          <Card key={request.id} className="hover:shadow-md transition-shadow border-amber-200 dark:border-amber-900">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <FileCheck className="h-4 w-4 text-amber-500" />
                                  <CardTitle className="text-base">{request.reference_id || request.id.slice(0, 8)}</CardTitle>
                                </div>
                                <Badge 
                                  variant={isFinalClosure ? 'default' : 'secondary'} 
                                  className={isFinalClosure ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                                >
                                  {isFinalClosure 
                                    ? t('dashboard.finalClosure', 'Final Closure')
                                    : t('dashboard.investigationApproval', 'Investigation Approval')
                                  }
                                </Badge>
                              </div>
                              <CardDescription>{request.title}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                {request.requester_name && (
                                  <div>
                                    <span className="font-medium">{t('investigation.requestedBy', 'Requested By')}:</span>{' '}
                                    {request.requester_name}
                                  </div>
                                )}
                                {request.closure_requested_at && (
                                  <div>
                                    <span className="font-medium">{t('common.createdAt', 'Requested')}:</span>{' '}
                                    {formatDistanceToNow(new Date(request.closure_requested_at), { addSuffix: true })}
                                  </div>
                                )}
                              </div>
                              
                              <Button asChild size="sm">
                                <Link to={`/incidents/investigate?incident=${request.id}&from=my-actions`} className="gap-2">
                                  {t('investigation.approvals.reviewClosure', 'Review & Approve')}
                                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                                </Link>
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Severity Changes Section (Admin/HSSE Manager only) */}
                {canApproveSeverity && pendingSeverity && pendingSeverity.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      {t('investigation.approvals.severityChanges', 'Severity Changes')}
                      <Badge variant="secondary">{pendingSeverity.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingSeverity.map((incident) => (
                        <SeverityApprovalCard key={incident.id} incident={incident} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Verifications Section - Only for HSSE Expert, HSSE Manager, Environmental Expert/Manager */}
                {canVerifyActions && pendingApprovals && pendingApprovals.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      {t('investigation.approvals.actionVerifications', 'Action Verifications')}
                      <Badge variant="secondary">{pendingApprovals.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingApprovals.map((action) => (
                        <Card key={action.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                {action.reference_id && (
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {action.reference_id}
                                  </Badge>
                                )}
                                <CardTitle className="text-base">{action.title}</CardTitle>
                              </div>
                              <div className="flex items-center gap-2">
                                {action.priority && (
                                  <Badge variant={getPriorityBadgeVariant(action.priority)}>
                                    {t(`investigation.priority.${action.priority}`, action.priority)}
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  {t('investigation.actionStatus.completed', 'Completed')}
                                </Badge>
                              </div>
                            </div>
                            <CardDescription>{action.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              {action.assigned_user && (
                                <div>
                                  <span className="font-medium">{t('investigation.assignedTo', 'Assigned To')}:</span>{' '}
                                  {action.assigned_user.full_name}
                                </div>
                              )}
                              {action.department && (
                                <div>
                                  <span className="font-medium">{t('investigation.department', 'Department')}:</span>{' '}
                                  {action.department.name}
                                </div>
                              )}
                              {action.completed_date && (
                                <div>
                                  <span className="font-medium">{t('investigation.completedOn', 'Completed')}:</span>{' '}
                                  {new Date(action.completed_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => setSelectedActionForVerification(action)}>
                                <ShieldCheck className="h-4 w-4 me-2" />
                                {t('investigation.approvals.reviewAction', 'Review & Verify')}
                              </Button>
                              {action.incident_id && (
                                <Button asChild variant="ghost" size="sm">
                                  <Link to={`/incidents/${action.incident_id}`} className="gap-2">
                                    {t('investigation.viewIncident', 'View Incident')}
                                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extension Requests Section (HSSE Expert Approval) */}
                {pendingExtensions && pendingExtensions.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CalendarPlus className="h-5 w-5 text-amber-500" />
                      {t('actions.extensionRequests', 'Extension Requests')}
                      <Badge variant="secondary">{pendingExtensions.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingExtensions.map((request) => (
                        <ExtensionApprovalCard 
                          key={request.id} 
                          request={request} 
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Contractor Worker Approvals Section (Security Supervisor/Manager) */}
                {canApproveWorkers && pendingWorkers && pendingWorkers.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <HardHat className="h-5 w-5 text-amber-500" />
                      {t('contractors.workers.pendingApprovals', 'Worker Approvals')}
                      <Badge variant="secondary">{pendingWorkers.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingWorkers.map((worker) => (
                        <Card key={worker.id} className="hover:shadow-md transition-shadow border-amber-200 dark:border-amber-900">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <HardHat className="h-4 w-4 text-amber-500" />
                                <CardTitle className="text-base">{worker.full_name}</CardTitle>
                              </div>
                              <Badge variant="outline">
                                {t('contractors.workers.pendingApproval', 'Pending Approval')}
                              </Badge>
                            </div>
                            <CardDescription>
                              {worker.company?.company_name || t('common.unknown', 'Unknown Company')}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">{t('contractors.workers.nationalId', 'National ID')}:</span>{' '}
                                {worker.national_id}
                              </div>
                              {worker.nationality && (
                                <div>
                                  <span className="font-medium">{t('contractors.workers.nationality', 'Nationality')}:</span>{' '}
                                  {worker.nationality}
                                </div>
                              )}
                              {worker.created_at && (
                                <div>
                                  <span className="font-medium">{t('common.submitted', 'Submitted')}:</span>{' '}
                                  {formatDistanceToNow(new Date(worker.created_at), { addSuffix: true })}
                                </div>
                              )}
                            </div>
                            
                            <Button asChild size="sm">
                              <Link to="/contractors/workers?tab=pending" className="gap-2">
                                {t('contractors.workers.reviewWorker', 'Review & Approve')}
                                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gate Pass Approvals Section (Project Manager/Safety Supervisor) */}
                {canApproveGatePasses && pendingGatePasses && pendingGatePasses.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Truck className="h-5 w-5 text-amber-500" />
                      {t('contractors.gatePasses.pendingApprovals', 'Gate Pass Approvals')}
                      <Badge variant="secondary">{pendingGatePasses.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingGatePasses.map((pass) => (
                        <Card key={pass.id} className="hover:shadow-md transition-shadow border-amber-200 dark:border-amber-900">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-amber-500" />
                                <CardTitle className="text-base">{pass.reference_number}</CardTitle>
                              </div>
                              <Badge variant={pass.status === 'pending_pm_approval' ? 'secondary' : 'outline'}>
                                {pass.status === 'pending_pm_approval' 
                                  ? t('contractors.gatePasses.awaitingPM', 'Awaiting PM')
                                  : t('contractors.gatePasses.awaitingSafety', 'Awaiting Safety')
                                }
                              </Badge>
                            </div>
                            <CardDescription>
                              {pass.material_description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              {pass.project?.project_name && (
                                <div>
                                  <span className="font-medium">{t('contractors.project', 'Project')}:</span>{' '}
                                  {pass.project.project_name}
                                </div>
                              )}
                              {pass.company?.company_name && (
                                <div>
                                  <span className="font-medium">{t('contractors.company', 'Company')}:</span>{' '}
                                  {pass.company.company_name}
                                </div>
                              )}
                              <div>
                                <span className="font-medium">{t('contractors.gatePasses.passDate', 'Date')}:</span>{' '}
                                {new Date(pass.pass_date).toLocaleDateString()}
                              </div>
                            </div>
                            
                            <Button asChild size="sm">
                              <Link to="/contractors/gate-passes?tab=pending" className="gap-2">
                                {t('contractors.gatePasses.reviewPass', 'Review & Approve')}
                                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!pendingApprovals || pendingApprovals.length === 0) && 
                 (!canApproveSeverity || !pendingSeverity || pendingSeverity.length === 0) &&
                 (!pendingIncidentApprovals || pendingIncidentApprovals.length === 0) &&
                 (!canApproveClosures || !pendingClosures || pendingClosures.length === 0) &&
                 (!pendingExtensions || pendingExtensions.length === 0) &&
                 (!canApproveWorkers || !pendingWorkers || pendingWorkers.length === 0) &&
                 (!canApproveGatePasses || !pendingGatePasses || pendingGatePasses.length === 0) && (
                  <Card className="py-12">
                    <CardContent className="flex flex-col items-center justify-center text-center">
                      <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        {t('investigation.approvals.noApprovals', 'No Pending Approvals')}
                      </h3>
                      <p className="text-muted-foreground">
                        {t('investigation.approvals.noApprovalsDescription', 'There are no actions or changes awaiting your approval.')}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog for entering witness statement */}
      <Dialog open={!!selectedWitnessTask} onOpenChange={(open) => !open && setSelectedWitnessTask(null)}>
        <DialogContent className="max-w-2xl" dir={direction}>
          <DialogHeader>
            <DialogTitle>{t('investigation.witnesses.provideStatement', 'Provide Statement')}</DialogTitle>
          </DialogHeader>
          {selectedWitnessTask && (
            <WitnessDirectEntry
              incidentId={selectedWitnessTask.incident_id}
              existingStatementId={selectedWitnessTask.id}
              onSuccess={handleWitnessStatementSubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Action Verification Dialog */}
      <ActionVerificationDialog
        action={selectedActionForVerification}
        open={!!selectedActionForVerification}
        onOpenChange={(open) => !open && setSelectedActionForVerification(null)}
      />

      {/* Action Progress Dialog - for Start Work and Complete Action */}
      <ActionProgressDialog
        action={actionDialogAction}
        mode={actionDialogMode}
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        onConfirm={handleActionDialogConfirm}
        isSubmitting={updateStatus.isPending || uploadEvidence.isPending}
      />

      {/* Extension Request Dialog */}
      {extensionRequestAction && (
        <ExtensionRequestDialog
          action={extensionRequestAction}
          open={!!extensionRequestAction}
          onOpenChange={(open) => !open && setExtensionRequestAction(null)}
        />
      )}
    </div>
  );
}
