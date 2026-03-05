import { useMyActionsFilters } from './useMyActionsFilters';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { useMyCorrectiveActions, useUpdateMyActionStatus, useMyReportedIncidents } from '@/features/incidents';
import { useMyAssignedWitnessStatements, useStartWitnessWork, useUpdateWitnessStatement } from '@/hooks/use-witness-statements';


import { ActionForDialog } from '../types';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle, PlayCircle, FileCheck, MessageSquare, ShieldCheck } from 'lucide-react';

export function useMyActions() {

  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  const { data: incidentActions, isLoading: actionsLoading } = useMyCorrectiveActions();
  const { data: inspectionActions, isLoading: inspectionActionsLoading } = useMyInspectionActions();
  const { data: witnessStatements, isLoading: witnessLoading, refetch: refetchWitness } = useMyAssignedWitnessStatements();
  const { data: myReportedIncidents, isLoading: reportedLoading } = useMyReportedIncidents();

  // NEW: Unified workflow hooks for investigations and inspections
  const { data: myInvestigations, isLoading: investigationsLoading } = useMyAssignedInvestigations();
  const { data: myInspections, isLoading: inspectionsLoading } = useMyScheduledInspections();

  // Read filter from URL
  const [searchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter');

  const updateStatus = useUpdateMyActionStatus();
  const updateInspectionStatus = useUpdateInspectionActionStatus();
  const uploadEvidence = useUploadActionEvidence();
  const [selectedWitnessTask, setSelectedWitnessTask] = useState<{ id: string; incident_id: string } | null>(null);
  const [activeTab, setActiveTab] = useState('actions');
  const [activeFilter, setActiveFilter] = useState<string | null>(urlFilter || null);
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

  const approvalsState = useMyApprovalsState();

  // Combine incident and inspection actions into a unified list with source indicator
  // Combine incident and inspection actions into a unified list with source indicator
  const allActions = [
    ...(incidentActions || []).map(a => ({ ...a, source: 'incident' as const })),
    ...(inspectionActions || []).map(a => ({ ...a, source: 'inspection' as const })),
  ];



  // Handle extension request
  const handleRequestExtension = (action: ActionForDialog) => {
    setExtensionRequestAction(action);
  };

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

  const {
    pendingActions,
    inProgressActions,
    awaitingVerificationActions,
    closedActions,
    overdueActions,
    soonOverdueActions,
    displayedActiveActions,
    displayedClosedActions
  } = useMyActionsFilters({
    allActions,
    searchQuery,
    priorityFilter,
    activeFilter
  });

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
          logger.debug('Action changed:', payload);
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
    // Switch to actions tab when a filter is clicked
    setActiveTab('actions');
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
    ...(approvalsState.canAccessApprovals ? [{
      key: 'approvals',
      label: t('investigation.approvals.pendingApprovals', 'Approvals'),
      value: approvalsState.totalPendingApprovals,
      icon: ShieldCheck,
      status: approvalsState.totalPendingApprovals > 0 ? 'pending' as const : 'neutral' as const,
    }] : []),
  ];


  return {
    t,
    direction,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    activeTab,
    setActiveTab,
    activeFilter,
    setActiveFilter,
    kpiItems,
    isLoading,
    displayedActiveActions,
    displayedClosedActions,
    myInvestigations,
    myInspections,
    witnessStatements,
    myReportedIncidents,
    ...approvalsState,
    selectedWitnessTask,
    setSelectedWitnessTask,
    handleWitnessStatementSubmit,
    actionDialogAction,
    setActionDialogAction,
    actionDialogMode,
    setActionDialogMode,
    actionDialogOpen,
    setActionDialogOpen,
    handleActionDialogConfirm,
    extensionRequestAction,
    setExtensionRequestAction,
    handleRequestExtension,
    showClosedActions,
    setShowClosedActions,
    handleStartWork,
    handleMarkCompleted,
    handleFilterClick,
    allActions,
    updateStatus,
    uploadEvidence,
    submittingActionIds,
    getDaysInfo,
    updateInspectionStatus,
    approveGatePass
  };
}

