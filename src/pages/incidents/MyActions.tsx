import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, MessageSquare, Loader2, ShieldCheck, AlertTriangle, FileCheck, PlayCircle, RotateCcw, CalendarPlus, HardHat, Truck, ClipboardList, X, Search, ChevronDown, FileText, Eye } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KPIStrip, KPIItem } from '@/components/ui/kpi-strip';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyCorrectiveActions, useUpdateMyActionStatus, useMyReportedIncidents } from '@/hooks/use-incidents';
import { useMyAssignedWitnessStatements, useStartWitnessWork, useUpdateWitnessStatement } from '@/hooks/use-witness-statements';
import { usePendingActionApprovals, usePendingSeverityApprovals, usePendingPotentialSeverityApprovals, usePendingIncidentApprovals, useCanAccessApprovals, type PendingActionApproval } from '@/hooks/use-pending-approvals';
import { usePendingClosureRequests } from '@/hooks/use-incident-closure';
import { useUserRoles } from '@/hooks/use-user-roles';
import { usePendingExtensionRequests } from '@/hooks/use-action-extensions';
import { useUploadActionEvidence } from '@/hooks/use-action-evidence';
import { useMyInspectionActions, useUpdateInspectionActionStatus } from '@/hooks/use-inspection-actions';
import { usePendingWorkerApprovals } from '@/hooks/contractor-management/use-contractor-workers';
import { usePendingGatePassApprovals } from '@/hooks/contractor-management/use-material-gate-passes';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { WitnessDirectEntry } from '@/components/investigation/WitnessDirectEntry';
import { ActionVerificationDialog } from '@/components/investigation/ActionVerificationDialog';
import { SeverityApprovalCard } from '@/components/investigation/SeverityApprovalCard';
import { PotentialSeverityApprovalCard } from '@/components/investigation/PotentialSeverityApprovalCard';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionProgressDialog, ExtensionRequestDialog, ExtensionApprovalCard, ActionWorkflowTimeline } from '@/components/actions';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const getStatusIcon = (status: string | null) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'in_progress': return <Clock className="h-4 w-4 text-info" />;
    case 'verified': return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case 'approved': return <CheckCircle2 className="h-4 w-4 text-primary" />;
    default: return <AlertCircle className="h-4 w-4 text-warning" />;
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
  session_id?: string | null;
  source?: 'incident' | 'inspection';
}

export default function MyActions() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  const { data: incidentActions, isLoading: actionsLoading } = useMyCorrectiveActions();
  const { data: inspectionActions, isLoading: inspectionActionsLoading } = useMyInspectionActions();
  const { data: witnessStatements, isLoading: witnessLoading, refetch: refetchWitness } = useMyAssignedWitnessStatements();
  const { data: myReportedIncidents, isLoading: reportedLoading } = useMyReportedIncidents();
  
  const updateStatus = useUpdateMyActionStatus();
  const updateInspectionStatus = useUpdateInspectionActionStatus();
  const uploadEvidence = useUploadActionEvidence();
  const [selectedWitnessTask, setSelectedWitnessTask] = useState<{ id: string; incident_id: string } | null>(null);
  const [activeTab, setActiveTab] = useState('actions');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showClosedActions, setShowClosedActions] = useState(false);
  const [showClosedWitness, setShowClosedWitness] = useState(false);
  const queryClient = useQueryClient();
  
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
  const { data: pendingPotentialSeverity, isLoading: potentialSeverityLoading } = usePendingPotentialSeverityApprovals();
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
    const sessionId = actionDialogAction.session_id;
    const isInspectionAction = actionDialogAction.source === 'inspection';
    const mode = actionDialogMode;
    
    // Add to submitting set and close dialog immediately to prevent re-submission
    setSubmittingActionIds(prev => new Set(prev).add(actionId));
    setActionDialogOpen(false);
    setActionDialogAction(null);
    
    try {
      // Upload files first if any (for both incident and inspection actions)
      for (const file of data.files) {
        // For incident actions, use incident_id; for inspection actions, use session_id as context
        const contextId = incidentId || sessionId;
        if (contextId) {
          await uploadEvidence.mutateAsync({
            actionId: actionId,
            incidentId: contextId, // Use contextId for both types
            file,
          });
        }
      }

      // Update action status using the appropriate mutation
      if (isInspectionAction) {
        await updateInspectionStatus.mutateAsync({
          id: actionId,
          status: mode === 'start' ? 'in_progress' : 'completed',
          progressNotes: mode === 'start' ? data.notes : undefined,
          completionNotes: mode === 'complete' ? data.notes : undefined,
          overdueJustification: data.overdueJustification,
        });
      } else {
        await updateStatus.mutateAsync({
          id: actionId,
          status: mode === 'start' ? 'in_progress' : 'completed',
          progressNotes: mode === 'start' ? data.notes : undefined,
          completionNotes: mode === 'complete' ? data.notes : undefined,
          overdueJustification: data.overdueJustification,
        });
      }
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
  // Actions awaiting verification (completed but not yet verified)
  const awaitingVerificationActions = allActions?.filter(a => a.status === 'completed' || a.status === 'pending_verification') || [];
  // Fully closed actions (verified & finalized)
  const closedActions = allActions?.filter(a => a.status === 'closed' || a.status === 'verified') || [];

  // Include null assignment_status for unassigned statements
  const pendingWitness = witnessStatements?.filter(w => w.assignment_status === 'pending' || w.assignment_status === 'in_progress' || w.assignment_status === null) || [];

  // Calculate overdue actions (past due date, not closed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  const overdueActions = allActions?.filter(a => 
    a.due_date && 
    a.due_date < todayStr &&
    a.status !== 'completed' && 
    a.status !== 'verified' && 
    a.status !== 'closed'
  ) || [];

  // Calculate soon overdue actions (due within 7 days, not yet overdue)
  const soonOverdueThreshold = 7;
  const soonOverdueActions = allActions?.filter(a => {
    if (!a.due_date || a.status === 'completed' || a.status === 'verified' || a.status === 'closed') return false;
    const dueDate = new Date(a.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining > 0 && daysRemaining <= soonOverdueThreshold;
  }) || [];

  // Helper function to calculate days info for an action
  const getDaysInfo = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      days: Math.abs(diffDays),
      isOverdue: diffDays < 0,
      isDueToday: diffDays === 0,
      isDueSoon: diffDays > 0 && diffDays <= soonOverdueThreshold
    };
  };

  // Search and filter actions
  const filterAndSearchActions = (actions: typeof allActions) => {
    return actions.filter(action => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = action.title?.toLowerCase().includes(query);
        const matchesDescription = action.description?.toLowerCase().includes(query);
        const matchesReference = action.reference_id?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription && !matchesReference) {
          return false;
        }
      }
      
      // Priority filter
      if (priorityFilter !== 'all' && action.priority !== priorityFilter) {
        return false;
      }
      
      return true;
    });
  };

  // Get active (non-closed) actions - sorted by urgency
  const getActiveActions = () => {
    const filtered = filterAndSearchActions(allActions);
    const activeOnly = filtered.filter(a => a.status !== 'closed' && a.status !== 'verified');
    
    // Sort by urgency: overdue first, then due soon, then by due date
    return activeOnly.sort((a, b) => {
      const aDaysInfo = getDaysInfo(a.due_date);
      const bDaysInfo = getDaysInfo(b.due_date);
      
      // Overdue actions first
      if (aDaysInfo?.isOverdue && !bDaysInfo?.isOverdue) return -1;
      if (!aDaysInfo?.isOverdue && bDaysInfo?.isOverdue) return 1;
      
      // Then due soon
      if (aDaysInfo?.isDueSoon && !bDaysInfo?.isDueSoon) return -1;
      if (!aDaysInfo?.isDueSoon && bDaysInfo?.isDueSoon) return 1;
      
      // Then by due date
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      
      return 0;
    });
  };

  // Get closed actions
  const getClosedActions = () => {
    const filtered = filterAndSearchActions(allActions);
    return filtered.filter(a => a.status === 'closed' || a.status === 'verified');
  };

  // Filter actions based on active filter (for summary card clicks)
  const getFilteredActions = () => {
    const searchFiltered = filterAndSearchActions(allActions);
    if (!activeFilter) return searchFiltered;
    
    switch (activeFilter) {
      case 'overdue':
        return searchFiltered.filter(a => 
          a.due_date && 
          a.due_date < todayStr &&
          a.status !== 'completed' && 
          a.status !== 'verified' && 
          a.status !== 'closed'
        );
      case 'soon_overdue':
        return searchFiltered.filter(a => {
          if (!a.due_date || a.status === 'completed' || a.status === 'verified' || a.status === 'closed') return false;
          const dueDate = new Date(a.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysRemaining > 0 && daysRemaining <= soonOverdueThreshold;
        });
      case 'pending':
        return searchFiltered.filter(a => a.status === 'assigned' || a.status === 'pending' || a.status === 'returned_for_correction');
      case 'in_progress':
        return searchFiltered.filter(a => a.status === 'in_progress');
      case 'awaiting_verification':
        return searchFiltered.filter(a => a.status === 'completed' || a.status === 'pending_verification');
      case 'closed':
        return searchFiltered.filter(a => a.status === 'closed' || a.status === 'verified');
      default:
        return searchFiltered;
    }
  };

  const displayedActiveActions = activeFilter ? getFilteredActions().filter(a => a.status !== 'closed' && a.status !== 'verified') : getActiveActions();
  const displayedClosedActions = activeFilter === 'closed' ? getFilteredActions() : getClosedActions();

  const totalExtensions = pendingExtensions?.length || 0;
  const contractorApprovalCount = (canApproveWorkers ? (pendingWorkers?.length || 0) : 0) + (canApproveGatePasses ? (pendingGatePasses?.length || 0) : 0);
  const totalPendingApprovals = (canVerifyActions ? (pendingApprovals?.length || 0) : 0) + (canApproveSeverity ? ((pendingSeverity?.length || 0) + (pendingPotentialSeverity?.length || 0)) : 0) + (pendingIncidentApprovals?.length || 0) + (canApproveClosures ? (pendingClosures?.length || 0) : 0) + totalExtensions + contractorApprovalCount;

  const isLoading = actionsLoading || inspectionActionsLoading || witnessLoading;

  // Real-time subscription for corrective_actions changes
  useEffect(() => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel('my-actions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'corrective_actions',
        },
        (payload) => {
          console.log('Action changed:', payload);
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] });
          queryClient.invalidateQueries({ queryKey: ['my-inspection-actions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id, queryClient]);

  // Toggle filter - clicking same filter clears it
  const handleFilterClick = (filter: string) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  };

  // Build KPI items for the unified strip
  const kpiItems: KPIItem[] = [
    {
      key: 'overdue',
      label: t('investigation.overdueActions', 'Overdue'),
      value: overdueActions.length,
      icon: AlertTriangle,
      status: overdueActions.length > 0 ? 'critical' : 'neutral',
      onClick: () => handleFilterClick('overdue'),
    },
    {
      key: 'soon_overdue',
      label: t('actions.dueSoon', 'Due Soon'),
      value: soonOverdueActions.length,
      icon: Clock,
      status: soonOverdueActions.length > 0 ? 'pending' : 'neutral',
      onClick: () => handleFilterClick('soon_overdue'),
    },
    {
      key: 'pending',
      label: t('investigation.pendingActions', 'Pending'),
      value: pendingActions.length,
      icon: AlertCircle,
      status: pendingActions.length > 0 ? 'pending' : 'neutral',
      onClick: () => handleFilterClick('pending'),
    },
    {
      key: 'in_progress',
      label: t('investigation.inProgressActions', 'In Progress'),
      value: inProgressActions.length,
      icon: PlayCircle,
      status: 'informational',
      onClick: () => handleFilterClick('in_progress'),
    },
    {
      key: 'awaiting_verification',
      label: t('investigation.awaitingVerification', 'Awaiting'),
      value: awaitingVerificationActions.length,
      icon: FileCheck,
      status: awaitingVerificationActions.length > 0 ? 'pending' : 'neutral',
      onClick: () => handleFilterClick('awaiting_verification'),
    },
    {
      key: 'closed',
      label: t('investigation.closedActions', 'Closed'),
      value: closedActions.length,
      icon: CheckCircle2,
      status: 'completed',
      onClick: () => handleFilterClick('closed'),
    },
    {
      key: 'statements',
      label: t('investigation.witnesses.pendingStatements', 'Statements'),
      value: pendingWitness.length,
      icon: MessageSquare,
      status: pendingWitness.length > 0 ? 'informational' : 'neutral',
    },
    ...(canAccessApprovals ? [{
      key: 'approvals',
      label: t('investigation.approvals.pendingApprovals', 'Approvals'),
      value: totalPendingApprovals,
      icon: ShieldCheck,
      status: totalPendingApprovals > 0 ? 'pending' as const : 'neutral' as const,
    }] : []),
  ];

  return (
    <div className="container py-6 space-y-6" dir={direction}>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">{t('investigation.myActions', 'My Actions')}</h1>
          <p className="text-muted-foreground">{t('investigation.myActionsDescription', 'View and manage your assigned tasks')}</p>
        </div>
      </div>

      {/* Summary KPI Strip - Unified Design */}
      <KPIStrip items={kpiItems} compact />

      {/* Active Filter Indicator */}
      {activeFilter && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground">
            {t('investigation.filteringBy', 'Filtering by')}: 
            <span className="font-medium text-foreground ms-1">
              {activeFilter === 'overdue' && t('investigation.overdueActions', 'Overdue')}
              {activeFilter === 'soon_overdue' && t('actions.dueSoon', 'Due Soon')}
              {activeFilter === 'pending' && t('investigation.pendingActions', 'Pending')}
              {activeFilter === 'in_progress' && t('investigation.inProgressActions', 'In Progress')}
              {activeFilter === 'awaiting_verification' && t('investigation.awaitingVerification', 'Awaiting Verification')}
              {activeFilter === 'closed' && t('investigation.closedActions', 'Closed')}
            </span>
          </span>
          <Button
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveFilter(null)}
            className="h-6 px-2 gap-1"
          >
            <X className="h-3 w-3" />
            {t('common.clear', 'Clear')}
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="inline-flex w-auto min-w-full sm:w-full">
            <TabsTrigger value="actions" className="whitespace-nowrap">
              <ClipboardList className="h-4 w-4 me-2 flex-shrink-0" />
              <span className="hidden sm:inline">{t('investigation.correctiveActions', 'Corrective Actions')}</span>
              <span className="sm:hidden">{t('investigation.actions', 'Actions')}</span>
              <span className="ms-1">({allActions?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="witness" className="whitespace-nowrap">
              <MessageSquare className="h-4 w-4 me-2 flex-shrink-0" />
              <span className="hidden sm:inline">{t('investigation.witnesses.title', 'Witness Statements')}</span>
              <span className="sm:hidden">{t('investigation.witness', 'Witness')}</span>
              <span className="ms-1">({witnessStatements?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="reported" className="whitespace-nowrap">
              <FileText className="h-4 w-4 me-2 flex-shrink-0" />
              <span className="hidden sm:inline">{t('investigation.myReportedIncidents', 'My Reported Incidents')}</span>
              <span className="sm:hidden">{t('investigation.reported', 'Reported')}</span>
              <span className="ms-1">({myReportedIncidents?.length || 0})</span>
            </TabsTrigger>
            {canAccessApprovals && (
              <TabsTrigger value="approvals" className="gap-2 whitespace-nowrap">
                <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('investigation.approvals.pendingApprovals', 'Pending Approvals')}</span>
                <span className="sm:hidden">{t('investigation.approvals.approvals', 'Approvals')}</span>
                {totalPendingApprovals > 0 && (
                  <Badge variant="secondary" className="ms-1">
                    {totalPendingApprovals}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="actions" className="mt-4 space-y-4">
          {/* Search Bar and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={t('search.placeholder', 'Search by title, description, or reference...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('filter.allPriorities', 'All Priorities')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allPriorities', 'All Priorities')}</SelectItem>
                <SelectItem value="critical">{t('investigation.priority.critical', 'Critical')}</SelectItem>
                <SelectItem value="high">{t('investigation.priority.high', 'High')}</SelectItem>
                <SelectItem value="medium">{t('investigation.priority.medium', 'Medium')}</SelectItem>
                <SelectItem value="low">{t('investigation.priority.low', 'Low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
          ) : (displayedActiveActions.length > 0 || displayedClosedActions.length > 0) ? (
            <div className="space-y-6">
              {/* Active Actions Section */}
              {displayedActiveActions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {t('actions.activeActions', 'Active Actions')} ({displayedActiveActions.length})
                  </h3>
                  {displayedActiveActions.map((action) => {
                    const isIncidentAction = action.source === 'incident';
                    // Extract workflow fields - now available for both incident and inspection actions
                    const returnCount = 'return_count' in action ? (action.return_count || 0) : 0;
                    const lastReturnReason = 'last_return_reason' in action ? action.last_return_reason : null;
                    const rejectionNotes = 'rejection_notes' in action ? action.rejection_notes : null;
                    const rejectedByProfile = 'rejected_by_profile' in action ? action.rejected_by_profile : null;
                    const rejectedAt = 'rejected_at' in action ? action.rejected_at : null;
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
                                {String(t(`investigation.priority.${action.priority}`, action.priority))}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardDescription>{action.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Show workflow timeline for both incident and inspection actions */}
                        <ActionWorkflowTimeline 
                          currentStatus={action.status} 
                          returnCount={returnCount}
                          className="py-2 mb-2"
                        />
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {action.due_date && (
                            <>
                              <div>
                                <span className="font-medium">{t('investigation.dueDate', 'Due Date')}:</span>{' '}
                                {new Date(action.due_date).toLocaleDateString()}
                              </div>
                              {(() => {
                                const daysInfo = getDaysInfo(action.due_date);
                                if (!daysInfo) return null;
                                if (action.status === 'closed' || action.status === 'verified') return null;
                                
                                return (
                                  <Badge 
                                    variant="outline"
                                    className={cn(
                                      "font-medium",
                                      daysInfo.isOverdue && "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
                                      daysInfo.isDueToday && "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
                                      daysInfo.isDueSoon && !daysInfo.isDueToday && "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800",
                                      !daysInfo.isOverdue && !daysInfo.isDueSoon && !daysInfo.isDueToday && "bg-green-100 text-green-700 border-green-300 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800"
                                    )}
                                  >
                                    {daysInfo.isDueToday ? (
                                      <>{t('actions.dueToday', 'Due Today')}</>
                                    ) : daysInfo.isOverdue ? (
                                      <>{t('assets.dashboard.daysOverdue', '{{count}} days overdue', { count: daysInfo.days })}</>
                                    ) : (
                                      <>{t('actions.daysRemaining', '{{days}} days remaining', { days: daysInfo.days })}</>
                                    )}
                                  </Badge>
                                );
                              })()}
                            </>
                          )}
                          {action.created_at && (
                            <div>
                              <span className="font-medium">{t('common.createdAt', 'Created')}:</span>{' '}
                              {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                        
                        {/* Show rejection info for both incident and inspection actions */}
                        {action.status === 'returned_for_correction' && (lastReturnReason || rejectionNotes) && (
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
                        
                        <div className="flex flex-wrap items-center gap-3">
                          {action.status === 'returned_for_correction' && (
                            <Badge variant="destructive" className="gap-1">
                              <RotateCcw className="h-3 w-3" />
                              {t('actions.returnedForCorrection', 'Returned for Correction')}
                            </Badge>
                          )}
                          
                          {submittingActionIds.has(action.id) && (
                            <Badge variant="outline" className="animate-pulse gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {t('common.processing', 'Processing...')}
                            </Badge>
                          )}
                          
                          {(action.status === 'assigned' || action.status === 'returned_for_correction') && !submittingActionIds.has(action.id) && (
                            <Button 
                              size="sm" 
                              onClick={() => handleStartWork({ ...action, source: action.source, session_id: sessionId })}
                              disabled={(updateStatus.isPending || updateInspectionStatus.isPending) || submittingActionIds.has(action.id)}
                            >
                              <PlayCircle className="h-4 w-4 me-2" />
                              {action.status === 'returned_for_correction' 
                                ? t('actions.resubmit', 'Resubmit')
                                : t('investigation.actions.startWork', 'Start Work')
                              }
                            </Button>
                          )}
                          
                          {action.status === 'in_progress' && !submittingActionIds.has(action.id) && (
                            <>
                              <Button 
                                size="sm"
                                onClick={() => handleMarkCompleted({ ...action, source: action.source, session_id: sessionId })}
                                disabled={(updateStatus.isPending || updateInspectionStatus.isPending) || submittingActionIds.has(action.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 me-2" />
                                {t('investigation.actions.markCompleted', 'Mark Completed')}
                              </Button>
                              
                              {/* Show extension request for overdue actions (both incident and inspection) */}
                              {action.due_date && new Date(action.due_date) < new Date() && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleRequestExtension({ ...action, source: action.source, session_id: sessionId })}
                                >
                                  <CalendarPlus className="h-4 w-4 me-2" />
                                  {t('actions.requestExtension', 'Request Extension')}
                                </Button>
                              )}
                            </>
                          )}
                          
                          {action.status === 'completed' && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              <Clock className="h-3 w-3 me-1" />
                              {t('investigation.actions.awaitingVerification', 'Awaiting Verification')}
                            </Badge>
                          )}
                          
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
              )}

              {/* Closed Actions Section - Collapsible */}
              {displayedClosedActions.length > 0 && (
                <Collapsible open={showClosedActions} onOpenChange={setShowClosedActions}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-md bg-muted hover:bg-muted/80 transition-colors">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{t('actions.closedActions', 'Closed Actions')}</span>
                    <Badge variant="secondary" className="ms-1">{displayedClosedActions.length}</Badge>
                    <ChevronDown className={cn("h-4 w-4 ms-auto transition-transform", showClosedActions && "rotate-180")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    {displayedClosedActions.map((action) => {
                      const isIncidentAction = action.source === 'incident';
                      const incidentId = isIncidentAction && 'incident_id' in action ? action.incident_id : null;
                      const sessionId = !isIncidentAction && 'session_id' in action ? action.session_id : null;
                      
                      return (
                        <Card key={action.id} className="hover:shadow-md transition-shadow opacity-75">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                {action.reference_id && (
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {action.reference_id}
                                  </Badge>
                                )}
                                <Badge variant={isIncidentAction ? 'secondary' : 'outline'} className="text-xs">
                                  {isIncidentAction 
                                    ? t('investigation.source.incident', 'Incident')
                                    : t('investigation.source.inspection', 'Inspection')
                                  }
                                </Badge>
                                <CardTitle className="text-base">{action.title}</CardTitle>
                              </div>
                              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3 me-1" />
                                {action.status === 'verified' ? t('investigation.actionStatus.verified', 'Verified') : t('investigation.actionStatus.closed', 'Closed')}
                              </Badge>
                            </div>
                            <CardDescription>{action.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              {action.due_date && (
                                <div>
                                  <span className="font-medium">{t('investigation.dueDate', 'Due Date')}:</span>{' '}
                                  {new Date(action.due_date).toLocaleDateString()}
                                </div>
                              )}
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
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                {searchQuery || priorityFilter !== 'all' ? (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">{t('search.noResults', 'No Results Found')}</h3>
                    <p className="text-muted-foreground">{t('search.tryDifferent', 'Try adjusting your search or filter criteria.')}</p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">{t('investigation.noActionsAssigned', 'No Actions Assigned')}</h3>
                    <p className="text-muted-foreground">{t('investigation.noActionsDescription', 'You have no pending corrective actions.')}</p>
                  </>
                )}
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
              {witnessStatements.map((statement) => {
                const isReturned = statement.return_count && statement.return_count > 0;
                return (
                <Card key={statement.id} className={cn("hover:shadow-md transition-shadow", isReturned && "border-destructive/50")}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(statement.assignment_status)}
                        <CardTitle className="text-base">
                          {t('investigation.witnesses.statementRequest', 'Witness Statement Request')}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {isReturned && (
                          <Badge variant="destructive" className="gap-1">
                            <RotateCcw className="h-3 w-3" />
                            {t('investigation.witnesses.returnedCount', 'Returned {{count}}x', { count: statement.return_count })}
                          </Badge>
                        )}
                        <Badge variant={statement.assignment_status === 'pending' ? (isReturned ? 'destructive' : 'secondary') : statement.assignment_status === 'approved' ? 'default' : 'secondary'}>
                          {statement.assignment_status === 'completed' 
                            ? t('investigation.witnesses.status.awaitingReview', 'Awaiting Review')
                            : t(`investigation.witnesses.status.${statement.assignment_status}`, statement.assignment_status || 'pending')}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {t('investigation.witnesses.assignedToProvide', 'You have been assigned to provide a witness statement for an incident.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Return reason banner */}
                    {isReturned && statement.return_reason && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                        <p className="text-sm font-medium text-destructive mb-1">
                          {t('investigation.witnesses.returnReason', 'Reason for Return')}:
                        </p>
                        <p className="text-sm text-destructive/80">{statement.return_reason}</p>
                      </div>
                    )}
                    
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
                        {isReturned 
                          ? t('investigation.witnesses.resubmitStatement', 'Resubmit Statement')
                          : t('investigation.witnesses.provideStatement', 'Provide Statement')
                        }
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
              )})}
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

        {/* My Reported Incidents Tab */}
        <TabsContent value="reported" className="mt-4 space-y-4">
          {reportedLoading ? (
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
          ) : myReportedIncidents && myReportedIncidents.length > 0 ? (
            <div className="space-y-4">
              {myReportedIncidents.map((incident) => (
                <Card key={incident.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusIcon(incident.status)}
                        {incident.reference_id && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {incident.reference_id}
                          </Badge>
                        )}
                        <CardTitle className="text-base">{incident.title}</CardTitle>
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
                        <Badge variant="secondary">
                          {t(`incidents.status.${incident.status}`, incident.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {incident.site && (
                        <div>
                          <span className="font-medium">{t('common.site', 'Site')}:</span>{' '}
                          {incident.site.name}
                        </div>
                      )}
                      {incident.branch && (
                        <div>
                          <span className="font-medium">{t('common.branch', 'Branch')}:</span>{' '}
                          {incident.branch.name}
                        </div>
                      )}
                      {incident.occurred_at && (
                        <div>
                          <span className="font-medium">{t('incidents.occurredAt', 'Occurred')}:</span>{' '}
                          {new Date(incident.occurred_at).toLocaleDateString()}
                        </div>
                      )}
                      {incident.created_at && (
                        <div>
                          <span className="font-medium">{t('common.createdAt', 'Reported')}:</span>{' '}
                          {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                    
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/incidents/${incident.id}`} className="gap-2">
                        <Eye className="h-4 w-4" />
                        {t('common.viewDetails', 'View Details')}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('investigation.noReportedIncidents', 'No Reported Incidents')}</h3>
                <p className="text-muted-foreground">{t('investigation.noReportedDescription', 'You have not reported any incidents yet.')}</p>
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
                      <AlertCircle className="h-5 w-5 text-warning" />
                      {t('investigation.approvals.incidentApprovals', 'Incident Approvals')}
                      <Badge variant="secondary">{pendingIncidentApprovals.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingIncidentApprovals.map((incident) => (
                        <Card key={incident.id} className="hover:shadow-md transition-shadow border-warning/30">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-warning" />
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
                      <FileCheck className="h-5 w-5 text-warning" />
                      {t('dashboard.pendingClosures', 'Pending Closure Requests')}
                      <Badge variant="secondary">{pendingClosures.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingClosures.map((request) => {
                        const isFinalClosure = request.status === 'pending_final_closure';
                        return (
                          <Card key={request.id} className="hover:shadow-md transition-shadow border-warning/30">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <FileCheck className="h-4 w-4 text-warning" />
                                  <CardTitle className="text-base">{request.reference_id || request.id.slice(0, 8)}</CardTitle>
                                </div>
                                <Badge 
                                  variant={isFinalClosure ? 'default' : 'secondary'} 
                                  className={isFinalClosure ? 'bg-success/10 text-success border-success/30' : ''}
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
                      <AlertTriangle className="h-5 w-5 text-warning" />
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

                {/* Potential Severity Changes Section (Admin/HSSE Manager only) */}
                {canApproveSeverity && pendingPotentialSeverity && pendingPotentialSeverity.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-info" />
                      {t('investigation.approvals.potentialSeverityChanges', 'Potential Severity Assessments')}
                      <Badge variant="secondary">{pendingPotentialSeverity.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingPotentialSeverity.map((incident) => (
                        <PotentialSeverityApprovalCard key={incident.id} incident={incident} />
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
                      <CalendarPlus className="h-5 w-5 text-warning" />
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
                      <HardHat className="h-5 w-5 text-warning" />
                      {t('contractors.workers.pendingApprovals', 'Worker Approvals')}
                      <Badge variant="secondary">{pendingWorkers.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingWorkers.map((worker) => (
                        <Card key={worker.id} className="hover:shadow-md transition-shadow border-warning/30">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <HardHat className="h-4 w-4 text-warning" />
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
                      <Truck className="h-5 w-5 text-warning" />
                      {t('contractors.gatePasses.pendingApprovals', 'Gate Pass Approvals')}
                      <Badge variant="secondary">{pendingGatePasses.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingGatePasses.map((pass) => (
                        <Card key={pass.id} className="hover:shadow-md transition-shadow border-warning/30">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-warning" />
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
