import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMyCorrectiveActions, useUpdateMyActionStatus, useMyReportedIncidents } from '@/features/incidents';
import { useMyAssignedWitnessStatements } from '@/hooks/use-witness-statements';
import { ActionForDialog } from '../types';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle, PlayCircle, FileCheck, MessageSquare } from 'lucide-react';

interface KPIItem { key: string; label: string; value: number; icon: any; status: string; onClick?: () => void; }

export function useMyActions() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  const { data: incidentActions, isLoading: actionsLoading } = useMyCorrectiveActions();
  const { data: witnessStatements, isLoading: witnessLoading, refetch: refetchWitness } = useMyAssignedWitnessStatements();
  const { data: myReportedIncidents } = useMyReportedIncidents();
  const [searchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const updateStatus = useUpdateMyActionStatus();
  const [selectedWitnessTask, setSelectedWitnessTask] = useState<{ id: string; incident_id: string } | null>(null);
  const [activeTab, setActiveTab] = useState('actions');
  const [activeFilter, setActiveFilter] = useState<string | null>(urlFilter || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showClosedActions, setShowClosedActions] = useState(false);
  const queryClient = useQueryClient();
  const [actionDialogAction, setActionDialogAction] = useState<ActionForDialog | null>(null);
  const [actionDialogMode, setActionDialogMode] = useState<'start' | 'complete'>('start');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [extensionRequestAction, setExtensionRequestAction] = useState<ActionForDialog | null>(null);
  const [submittingActionIds, setSubmittingActionIds] = useState<Set<string>>(new Set());

  const allActions = (incidentActions || []).map((a: any) => ({ ...a, source: 'incident' as const }));
  const pendingWitness = (witnessStatements || []).filter((w: any) => w.status === 'pending');

  const pendingActions = allActions.filter((a: any) => a.status === 'pending');
  const inProgressActions = allActions.filter((a: any) => a.status === 'in_progress');
  const awaitingVerificationActions = allActions.filter((a: any) => a.status === 'awaiting_verification');
  const closedActions = allActions.filter((a: any) => ['completed', 'verified', 'closed'].includes(a.status));
  const overdueActions = allActions.filter((a: any) => a.due_date && new Date(a.due_date) < new Date() && !['completed', 'verified', 'closed'].includes(a.status));
  const soonOverdueActions = allActions.filter((a: any) => { if (!a.due_date || ['completed', 'verified', 'closed'].includes(a.status)) return false; const d = (new Date(a.due_date).getTime() - Date.now()) / 86400000; return d >= 0 && d <= 3; });

  const displayedActiveActions = allActions.filter((a: any) => !['completed', 'verified', 'closed'].includes(a.status));
  const displayedClosedActions = closedActions;

  const handleRequestExtension = (action: ActionForDialog) => { setExtensionRequestAction(action); };
  const handleStartWork = (action: ActionForDialog) => { if (submittingActionIds.has(action.id)) return; setActionDialogAction(action); setActionDialogMode('start'); setActionDialogOpen(true); };
  const handleMarkCompleted = (action: ActionForDialog) => { if (submittingActionIds.has(action.id)) return; setActionDialogAction(action); setActionDialogMode('complete'); setActionDialogOpen(true); };
  const handleActionDialogConfirm = async (data: { notes: string; overdueJustification?: string; files: File[] }) => {
    if (!actionDialogAction) return;
    setSubmittingActionIds(prev => new Set(prev).add(actionDialogAction.id));
    setActionDialogOpen(false); setActionDialogAction(null);
    try { await updateStatus.mutateAsync({ id: actionDialogAction.id, status: actionDialogMode === 'start' ? 'in_progress' : 'completed' }); } catch {} finally { setSubmittingActionIds(prev => { const n = new Set(prev); n.delete(actionDialogAction.id); return n; }); }
  };
  const handleWitnessStatementSubmit = () => { setSelectedWitnessTask(null); refetchWitness(); };
  const handleFilterClick = (filter: string) => { setActiveFilter(activeFilter === filter ? null : filter); setActiveTab('actions'); };
  const getDaysInfo = (date: string | null) => { if (!date) return { days: 0, label: '' }; const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000); return { days: diff, label: `${Math.abs(diff)}d` }; };
  const approveGatePass = { mutate: (_d: any) => {} } as any;
  const uploadEvidence = { mutateAsync: async (_d: any) => {} } as any;
  const updateInspectionStatus = { mutateAsync: async (_d: any) => {} } as any;
  const isLoading = actionsLoading || witnessLoading;

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const ch = supabase.channel('my-actions-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'corrective_actions' }, () => { queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] }); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.tenant_id, queryClient]);

  const kpiItems: KPIItem[] = [
    { key: 'overdue', label: t('investigation.overdueActions', 'Overdue'), value: overdueActions.length, icon: AlertTriangle, status: overdueActions.length > 0 ? 'critical' : 'neutral', onClick: () => handleFilterClick('overdue') },
    { key: 'pending', label: t('investigation.pendingActions', 'Pending'), value: pendingActions.length, icon: AlertCircle, status: pendingActions.length > 0 ? 'pending' : 'neutral', onClick: () => handleFilterClick('pending') },
    { key: 'in_progress', label: t('investigation.inProgressActions', 'In Progress'), value: inProgressActions.length, icon: PlayCircle, status: 'informational', onClick: () => handleFilterClick('in_progress') },
    { key: 'closed', label: t('investigation.closedActions', 'Closed'), value: closedActions.length, icon: CheckCircle2, status: 'completed', onClick: () => handleFilterClick('closed') },
    { key: 'statements', label: t('investigation.witnesses.pendingStatements', 'Statements'), value: pendingWitness.length, icon: MessageSquare, status: pendingWitness.length > 0 ? 'informational' : 'neutral' },
  ];

  return {
    t, direction, searchQuery, setSearchQuery, priorityFilter, setPriorityFilter, activeTab, setActiveTab, activeFilter, setActiveFilter, kpiItems, isLoading,
    displayedActiveActions, displayedClosedActions, myInvestigations: [] as any[], myInspections: [] as any[], witnessStatements, myReportedIncidents,
    canAccessApprovals: false, totalPendingApprovals: 0,
    selectedWitnessTask, setSelectedWitnessTask, handleWitnessStatementSubmit,
    actionDialogAction, setActionDialogAction, actionDialogMode, setActionDialogMode, actionDialogOpen, setActionDialogOpen, handleActionDialogConfirm,
    extensionRequestAction, setExtensionRequestAction, handleRequestExtension, showClosedActions, setShowClosedActions, handleStartWork, handleMarkCompleted,
    handleFilterClick, allActions, updateStatus, uploadEvidence, submittingActionIds, getDaysInfo, updateInspectionStatus, approveGatePass
  };
}
