import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, MessageSquare, Loader2, ShieldCheck, AlertTriangle, FileCheck, PlayCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useMyCorrectiveActions, useUpdateMyActionStatus } from '@/hooks/use-incidents';
import { useMyAssignedWitnessStatements } from '@/hooks/use-witness-statements';
import { usePendingActionApprovals, usePendingSeverityApprovals, usePendingIncidentApprovals, useCanAccessApprovals, type PendingActionApproval } from '@/hooks/use-pending-approvals';
import { usePendingClosureRequests } from '@/hooks/use-incident-closure';
import { useUserRoles } from '@/hooks/use-user-roles';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { WitnessDirectEntry } from '@/components/investigation/WitnessDirectEntry';
import { ActionVerificationDialog } from '@/components/investigation/ActionVerificationDialog';
import { SeverityApprovalCard } from '@/components/investigation/SeverityApprovalCard';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

export default function MyActions() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  const { data: actions, isLoading: actionsLoading } = useMyCorrectiveActions();
  const { data: witnessStatements, isLoading: witnessLoading, refetch: refetchWitness } = useMyAssignedWitnessStatements();
  const updateStatus = useUpdateMyActionStatus();
  const [selectedWitnessTask, setSelectedWitnessTask] = useState<{ id: string; incident_id: string } | null>(null);
  const [activeTab, setActiveTab] = useState('actions');
  const [confirmCompleteActionId, setConfirmCompleteActionId] = useState<string | null>(null);

  // Pending approvals data
  const { canAccess: canAccessApprovals, canApproveSeverity } = useCanAccessApprovals();
  const { hasRole } = useUserRoles();
  const { data: pendingApprovals, isLoading: approvalsLoading } = usePendingActionApprovals();
  const { data: pendingSeverity, isLoading: severityLoading } = usePendingSeverityApprovals();
  const { data: pendingIncidentApprovals, isLoading: incidentApprovalsLoading } = usePendingIncidentApprovals();
  const { data: pendingClosures, isLoading: closuresLoading } = usePendingClosureRequests();
  const [selectedActionForVerification, setSelectedActionForVerification] = useState<PendingActionApproval | null>(null);
  
  // Check if user can approve closures (HSSE Manager or Admin)
  const canApproveClosures = hasRole('admin') || hasRole('hsse_manager');

  // Controlled status transitions - no direct dropdown
  const handleStartWork = (actionId: string) => {
    updateStatus.mutate({ id: actionId, status: 'in_progress' });
  };

  const handleMarkCompleted = () => {
    if (confirmCompleteActionId) {
      updateStatus.mutate({ id: confirmCompleteActionId, status: 'completed' });
      setConfirmCompleteActionId(null);
    }
  };

  const handleWitnessStatementSubmit = () => {
    setSelectedWitnessTask(null);
    refetchWitness();
  };

  const pendingActions = actions?.filter(a => a.status === 'assigned' || a.status === 'pending') || [];
  const inProgressActions = actions?.filter(a => a.status === 'in_progress') || [];
  const completedActions = actions?.filter(a => a.status === 'completed' || a.status === 'verified') || [];

  const pendingWitness = witnessStatements?.filter(w => w.assignment_status === 'pending' || w.assignment_status === 'in_progress') || [];

  const totalPendingApprovals = (pendingApprovals?.length || 0) + (canApproveSeverity ? (pendingSeverity?.length || 0) : 0) + (pendingIncidentApprovals?.length || 0) + (canApproveClosures ? (pendingClosures?.length || 0) : 0);

  const isLoading = actionsLoading || witnessLoading;

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
            {t('investigation.correctiveActions', 'Corrective Actions')} ({actions?.length || 0})
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
          {actionsLoading ? (
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
          ) : actions && actions.length > 0 ? (
            <div className="space-y-4">
              {actions.map((action) => (
                <Card key={action.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(action.status)}
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
                    
                    {/* Controlled Action Buttons - Enforces sequential workflow */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Show "Start Work" for assigned actions */}
                      {action.status === 'assigned' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStartWork(action.id)}
                          disabled={updateStatus.isPending}
                        >
                          <PlayCircle className="h-4 w-4 me-2" />
                          {t('investigation.actions.startWork', 'Start Work')}
                        </Button>
                      )}
                      
                      {/* Show "Mark Completed" for in_progress actions */}
                      {action.status === 'in_progress' && (
                        <Button 
                          size="sm"
                          onClick={() => setConfirmCompleteActionId(action.id)}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 me-2" />
                          {t('investigation.actions.markCompleted', 'Mark Completed')}
                        </Button>
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
                                    {t(`investigation.eventTypes.${incident.event_type}`, incident.event_type)}
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

                {/* Action Verifications Section */}
                {pendingApprovals && pendingApprovals.length > 0 && (
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
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
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

                {/* Empty State */}
                {(!pendingApprovals || pendingApprovals.length === 0) && 
                 (!canApproveSeverity || !pendingSeverity || pendingSeverity.length === 0) &&
                 (!pendingIncidentApprovals || pendingIncidentApprovals.length === 0) &&
                 (!canApproveClosures || !pendingClosures || pendingClosures.length === 0) && (
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

      {/* Confirmation Dialog for Mark Completed */}
      <AlertDialog open={!!confirmCompleteActionId} onOpenChange={(open) => !open && setConfirmCompleteActionId(null)}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('investigation.actions.confirmComplete', 'Mark Action as Completed?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('investigation.actions.confirmCompleteDescription', 'This action will be marked as completed and sent for verification by HSSE. Make sure all required work has been done and evidence has been uploaded.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkCompleted} disabled={updateStatus.isPending}>
              {updateStatus.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('investigation.actions.confirmCompleteButton', 'Yes, Mark Completed')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
