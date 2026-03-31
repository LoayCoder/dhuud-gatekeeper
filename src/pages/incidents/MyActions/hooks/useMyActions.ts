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
import {
  useMyInspectionActions,
  useUpdateInspectionActionStatus,
  useUploadActionEvidence,
  useMyAssignedInvestigations,
  useMyScheduledInspections,
  type KPIItem,
} from '@/features/incidents';
import { useMyApprovalsState } from './useMyApprovalsState';
import { ActionForDialog } from '../types';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle, PlayCircle, FileCheck, MessageSquare, ShieldCheck } from 'lucide-react';
import { differenceInDays } from 'date-fns';

function getDaysInfo(dueDate: string | null | undefined) {
  if (!dueDate) return { days: 0, isOverdue: false, isSoon: false };
  const days = differenceInDays(new Date(dueDate), new Date());
  return { days, isOverdue: days < 0, isSoon: days >= 0 && days <= 3 };
}

export function useMyActions() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  const { data: incidentActions, isLoading: actionsLoading } = useMyCorrectiveActions();
  const { data: inspectionActions, isLoading: inspectionActionsLoading } = useMyInspectionActions();
  const { data: witnessStatements, isLoading: witnessLoading, refetch: refetchWitness } = useMyAssignedWitnessStatements();
  const { data: myReportedIncidents, isLoading: reportedLoading } = useMyReportedIncidents();

  const { data: myInvestigations, isLoading: investigationsLoading } = useMyAssignedInvestigations();
  const { data: myInspections, isLoading: inspectionsLoading } = useMyScheduledInspections();

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

  const [actionDialogAction, setActionDialogAction] = useState<ActionForDialog | null>(null);
  const [actionDialogMode, setActionDialogMode] = useState<'start' | 'complete'>('start');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [extensionRequestAction, setExtensionRequestAction] = useState<ActionForDialog | null>(null);
  const [submittingActionIds, setSubmittingActionIds] = useState<Set<string>>(new Set());
  const [selectedActionDetail, setSelectedActionDetail] = useState<ActionForDialog | null>(null);

  const approvalsState = useMyApprovalsState();

  const allActions = [
    ...(incidentActions || []).map(a => ({ ...a, source: 'incident' as const })),
    ...(inspectionActions || []).map(a => ({ ...a, source: 'inspection' as const })),
  ];

  const pendingWitness = (witnessStatements || []).filter((w: any) => w.status !== 'completed');

  const handleRequestExtension = (action: ActionForDialog) => {
    setExtensionRequestAction(action);
  };

  const handleStartWork = (action: ActionForDialog) => {
    if (submittingActionIds.has(action.id)) return;
    setActionDialogAction(action);
    setActionDialogMode('start');
    setActionDialogOpen(true);
  };

  const handleMarkCompleted = (action: ActionForDialog) => {
    if (submittingActionIds.has(action.id)) return;
    setActionDialogAction(action);
    setActionDialogMode('complete');
    setActionDialogOpen(true);
  };

  const handleSubmitInline = async (action: ActionForDialog, data: { notes: string; overdueJustification?: string }) => {
    if (submittingActionIds.has(action.id)) return;
    const actionId = action.id;
    const isInspectionAction = action.source === 'inspection';

    setSubmittingActionIds(prev => new Set(prev).add(actionId));
    try {
      if (isInspectionAction) {
        await updateInspectionStatus.mutateAsync({
          id: actionId,
          status: 'completed',
          completionNotes: data.notes,
          overdueJustification: data.overdueJustification,
        });
      } else {
        await updateStatus.mutateAsync({
          id: actionId,
          status: 'completed',
          completionNotes: data.notes,
          overdueJustification: data.overdueJustification,
        });
      }
      setSelectedActionDetail(null);
    } catch (error) {
      console.error('[MyActions] Inline submit failed:', error);
    } finally {
      setSubmittingActionIds(prev => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };

  const handleActionDialogConfirm = async (data: { notes: string; overdueJustification?: string; files: File[] }) => {
    if (!actionDialogAction) return;
    const actionId = actionDialogAction.id;
    const incidentId = actionDialogAction.incident_id;
    const sessionId = actionDialogAction.session_id;
    const isInspectionAction = actionDialogAction.source === 'inspection';
    const mode = actionDialogMode;

    setSubmittingActionIds(prev => new Set(prev).add(actionId));

    try {
      for (const file of data.files) {
        const contextId = incidentId || sessionId;
        if (contextId) {
          await uploadEvidence.mutateAsync({ actionId, incidentId: contextId, file });
        }
      }

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
      // Close dialog only after successful mutations
      setActionDialogOpen(false);
      setActionDialogAction(null);
    } catch (error) {
      // handled by mutation hooks — but keep dialog open so user can retry
      console.error('[MyActions] Action dialog confirm failed:', error);
    } finally {
      setSubmittingActionIds(prev => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
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

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const channel = supabase
      .channel('my-actions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'corrective_actions' }, (payload) => {
        logger.debug('Action changed:', payload);
        queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] });
        queryClient.invalidateQueries({ queryKey: ['my-inspection-actions'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.tenant_id, queryClient]);

  const handleFilterClick = (filter: string) => {
    setActiveFilter(activeFilter === filter ? null : filter);
    setActiveTab('actions');
  };

  const kpiItems: KPIItem[] = [
    { key: 'overdue', label: t('investigation.overdueActions', 'Overdue'), value: overdueActions.length, icon: AlertTriangle, status: overdueActions.length > 0 ? 'critical' : 'neutral', onClick: () => handleFilterClick('overdue') },
    { key: 'soon_overdue', label: t('actions.dueSoon', 'Due Soon'), value: soonOverdueActions.length, icon: Clock, status: soonOverdueActions.length > 0 ? 'pending' : 'neutral', onClick: () => handleFilterClick('soon_overdue') },
    { key: 'pending', label: t('investigation.pendingActions', 'Pending'), value: pendingActions.length, icon: AlertCircle, status: pendingActions.length > 0 ? 'pending' : 'neutral', onClick: () => handleFilterClick('pending') },
    { key: 'in_progress', label: t('investigation.inProgressActions', 'In Progress'), value: inProgressActions.length, icon: PlayCircle, status: 'informational', onClick: () => handleFilterClick('in_progress') },
    { key: 'awaiting_verification', label: t('investigation.awaitingVerification', 'Awaiting'), value: awaitingVerificationActions.length, icon: FileCheck, status: awaitingVerificationActions.length > 0 ? 'pending' : 'neutral', onClick: () => handleFilterClick('awaiting_verification') },
    { key: 'closed', label: t('investigation.closedActions', 'Closed'), value: closedActions.length, icon: CheckCircle2, status: 'completed', onClick: () => handleFilterClick('closed') },
    { key: 'statements', label: t('investigation.witnesses.pendingStatements', 'Statements'), value: pendingWitness.length, icon: MessageSquare, status: pendingWitness.length > 0 ? 'informational' : 'neutral' },
    ...(approvalsState.canAccessApprovals ? [{ key: 'approvals', label: t('investigation.approvals.pendingApprovals', 'Approvals'), value: approvalsState.totalPendingApprovals, icon: ShieldCheck, status: approvalsState.totalPendingApprovals > 0 ? 'pending' as const : 'neutral' as const }] : []),
  ];

  return {
    t, direction, searchQuery, setSearchQuery, priorityFilter, setPriorityFilter,
    activeTab, setActiveTab, activeFilter, setActiveFilter, kpiItems, isLoading,
    displayedActiveActions, displayedClosedActions, myInvestigations, myInspections,
    witnessStatements, myReportedIncidents, ...approvalsState,
    selectedWitnessTask, setSelectedWitnessTask, handleWitnessStatementSubmit,
    actionDialogAction, setActionDialogAction, actionDialogMode, setActionDialogMode,
    actionDialogOpen, setActionDialogOpen, handleActionDialogConfirm,
    extensionRequestAction, setExtensionRequestAction, handleRequestExtension,
    showClosedActions, setShowClosedActions, handleStartWork, handleMarkCompleted,
    handleFilterClick, allActions, updateStatus, uploadEvidence, submittingActionIds,
    getDaysInfo, updateInspectionStatus, approveGatePass: approvalsState.approveGatePass,
    selectedActionDetail, setSelectedActionDetail,
  };
}
