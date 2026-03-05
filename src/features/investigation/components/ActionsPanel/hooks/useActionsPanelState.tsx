import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCorrectiveActions, useCreateCorrectiveAction, useUpdateCorrectiveAction, useDeleteCorrectiveAction, CorrectiveAction } from '@/features/investigation';
import { useInvestigation } from '@/features/investigation';
import { useDepartmentsByBranch } from "@/hooks/use-departments-by-site";
import { useDepartmentUsers, useTenantUsers } from "@/hooks/use-department-users";
import { useRCAAI } from "@/hooks/use-rca-ai";
import { useIncident } from '@/features/incidents';
import { toast } from "sonner";
import { ActionsPanelProps, actionSchema, ActionFormValues, RootCause, ContributingFactor } from "../types";

export function useActionsPanelState({
  incidentId,
  incidentStatus,
  canEdit: canEditProp,
  onActionChange,
  openDialogTrigger,
  onDialogTriggered
}: ActionsPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [editingAction, setEditingAction] = useState<CorrectiveAction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Read-only mode when incident is closed OR canEdit prop is explicitly false
  const isLocked = incidentStatus === 'closed' || canEditProp === false;

  // Handle external dialog trigger from parent (e.g., ConsultantReviewCard "Create Action" button)
  useEffect(() => {
    console.log('[ActionsPanel] Dialog trigger check:', { 
      openDialogTrigger, 
      isLocked, 
      canEditProp,
      incidentStatus 
    });
    
    if (openDialogTrigger) {
      if (!isLocked) {
        console.log('[ActionsPanel] Opening dialog');
        setEditingAction(null);
        setDialogOpen(true);
      } else {
        console.warn('[ActionsPanel] Cannot open dialog - locked. canEdit:', canEditProp);
      }
      // Always consume the trigger to prevent state buildup
      onDialogTriggered?.();
    }
  }, [openDialogTrigger, isLocked, canEditProp, incidentStatus, onDialogTriggered]);

  const { data: actions, isLoading } = useCorrectiveActions(incidentId);
  const { data: investigation } = useInvestigation(incidentId);
  const { data: incident } = useIncident(incidentId);
  
  // Filter departments by the incident's branch for proper hierarchy compliance
  const incidentBranchId = incident?.branch_id;
  const { data: departments } = useDepartmentsByBranch(incidentBranchId || undefined);
  const { data: departmentUsers } = useDepartmentUsers(selectedDepartmentId);
  const { data: allUsers } = useTenantUsers();
  const createAction = useCreateCorrectiveAction();
  const updateAction = useUpdateCorrectiveAction();
  const deleteAction = useDeleteCorrectiveAction();
  const { suggestCorrectiveAction } = useRCAAI();

  // Parse root causes and contributing factors from investigation
  const investigationData = investigation as unknown as { 
    root_causes?: RootCause[]; 
    contributing_factors_list?: ContributingFactor[];
    five_whys?: Array<{ why: string; answer: string }>;
    immediate_cause?: string;
    underlying_cause?: string;
  } | null;
  const rootCauses: RootCause[] = investigationData?.root_causes || [];
  const contributingFactors: ContributingFactor[] = investigationData?.contributing_factors_list || [];

  const form = useForm<ActionFormValues>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      action_type: 'corrective',
      category: 'administrative',
      responsible_department_id: '',
      assigned_to: '',
      start_date: '',
      due_date: '',
      linked_cause_type: undefined,
      linked_root_cause_id: '',
    },
  });

  // Populate form when editing an action
  useEffect(() => {
    if (editingAction) {
      const actionData = editingAction as unknown as {
        linked_cause_type: string | null;
        linked_root_cause_id: string | null;
        category: string | null;
        start_date: string | null;
        responsible_department_id: string | null;
      };
      form.reset({
        title: editingAction.title || '',
        description: editingAction.description || '',
        priority: (editingAction.priority as 'low' | 'medium' | 'high' | 'critical') || 'medium',
        action_type: (editingAction.action_type as 'corrective' | 'preventive' | 'improvement') || 'corrective',
        category: (actionData.category as 'engineering' | 'administrative' | 'ppe' | 'training' | 'procedure_update') || 'administrative',
        responsible_department_id: actionData.responsible_department_id || '',
        assigned_to: editingAction.assigned_to || '',
        start_date: actionData.start_date || '',
        due_date: editingAction.due_date || '',
        linked_cause_type: (actionData.linked_cause_type as 'root_cause' | 'contributing_factor') || undefined,
        linked_root_cause_id: actionData.linked_root_cause_id || '',
      });
      setSelectedDepartmentId(actionData.responsible_department_id || null);
    }
  }, [editingAction, form]);

  const selectedCauseType = form.watch('linked_cause_type');
  const selectedCauseId = form.watch('linked_root_cause_id');

  // Get the appropriate list based on selected cause type
  const causesForSelection = useMemo(() => {
    if (selectedCauseType === 'root_cause') return rootCauses;
    if (selectedCauseType === 'contributing_factor') return contributingFactors;
    return [];
  }, [selectedCauseType, rootCauses, contributingFactors]);

  // Get selected cause details for preview
  const selectedCause = useMemo(() => {
    if (!selectedCauseId || selectedCauseId === '_none_') return null;
    if (selectedCauseType === 'root_cause') {
      return rootCauses.find(c => c.id === selectedCauseId);
    }
    return contributingFactors.find(c => c.id === selectedCauseId);
  }, [selectedCauseId, selectedCauseType, rootCauses, contributingFactors]);

  // Users to show in assignment dropdown
  const usersForAssignment = selectedDepartmentId ? departmentUsers : allUsers;

  // AI Suggest handler for title & description
  const handleAISuggestAction = async () => {
    if (!selectedCause) {
      toast.error(t('investigation.actions.ai.selectCauseFirst', 'Select a cause first'));
      return;
    }
    
    setIsAISuggesting(true);
    
    const rcaData = {
      incident_title: incident?.title,
      incident_description: incident?.description,
      severity: incident?.severity,
      event_type: incident?.event_type,
      five_whys: investigationData?.five_whys?.map(w => ({ question: w.why, answer: w.answer })),
      immediate_cause: investigationData?.immediate_cause,
      underlying_cause: investigationData?.underlying_cause,
      selected_cause_type: selectedCauseType as 'root_cause' | 'contributing_factor',
      selected_cause_text: selectedCause.text,
    };
    
    const result = await suggestCorrectiveAction(rcaData);
    
    if (result) {
      try {
        // Clean up markdown code blocks if present
        const cleanJson = result.replace(/```(?:json)?\s*/g, '').replace(/\s*```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        
        if (parsed.suggested_title) {
          form.setValue('title', parsed.suggested_title);
        }
        if (parsed.suggested_description) {
          form.setValue('description', parsed.suggested_description);
        }
        // Apply category, type, and priority from AI
        if (parsed.suggested_category && ['engineering', 'administrative', 'ppe', 'training', 'procedure_update'].includes(parsed.suggested_category)) {
          form.setValue('category', parsed.suggested_category);
        }
        if (parsed.suggested_type && ['corrective', 'preventive', 'improvement'].includes(parsed.suggested_type)) {
          form.setValue('action_type', parsed.suggested_type);
        }
        if (parsed.suggested_priority && ['critical', 'high', 'medium', 'low'].includes(parsed.suggested_priority)) {
          form.setValue('priority', parsed.suggested_priority);
        }
        toast.success(t('investigation.actions.ai.suggestionApplied', 'AI suggestion applied'));
      } catch (e) {
        console.error('Failed to parse AI suggestion:', e, result);
        toast.error(t('investigation.actions.ai.parseError', 'Failed to parse AI suggestion'));
      }
    }
    
    setIsAISuggesting(false);
  };

  const onSubmit = async (data: ActionFormValues) => {
    if (!data.title) return;
    
    // Validate cause linking when causes exist
    const hasCauses = rootCauses.length > 0 || contributingFactors.length > 0;
    if (hasCauses && (!data.linked_cause_type || !data.linked_root_cause_id)) {
      toast.error(t('investigation.actions.selectCauseRequired', 'Please link this action to a root cause or contributing factor'));
      return;
    }
    
    if (editingAction) {
      // Update existing action
      await updateAction.mutateAsync({
        id: editingAction.id,
        incidentId,
        updates: {
          title: data.title,
          description: data.description,
          priority: data.priority,
          action_type: data.action_type,
          due_date: data.due_date,
          start_date: data.start_date,
          category: data.category,
          linked_root_cause_id: data.linked_root_cause_id,
          linked_cause_type: data.linked_cause_type,
          responsible_department_id: data.responsible_department_id,
          assigned_to: data.assigned_to,
        },
      });
    } else {
      // Create new action
      await createAction.mutateAsync({
        incident_id: incidentId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        action_type: data.action_type,
        due_date: data.due_date,
        start_date: data.start_date,
        category: data.category,
        linked_root_cause_id: data.linked_root_cause_id,
        linked_cause_type: data.linked_cause_type,
        responsible_department_id: data.responsible_department_id,
        assigned_to: data.assigned_to,
      });
    }
    
    // Notify parent of action change
    onActionChange?.();
    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    form.reset({
      title: '',
      description: '',
      priority: 'medium',
      action_type: 'corrective',
      category: 'administrative',
      responsible_department_id: '',
      assigned_to: '',
      start_date: '',
      due_date: '',
      linked_cause_type: undefined,
      linked_root_cause_id: '',
    });
    setSelectedDepartmentId(null);
    setEditingAction(null);
    setDialogOpen(false);
  };

  const handleEditAction = (action: CorrectiveAction) => {
    setEditingAction(action);
    setDialogOpen(true);
  };

  const handleDeleteAction = async () => {
    if (!deleteConfirmId) return;
    await deleteAction.mutateAsync({ id: deleteConfirmId, incidentId });
    setDeleteConfirmId(null);
    // Notify parent of action change
    onActionChange?.();
  };

  const toggleActionExpand = (actionId: string) => {
    setExpandedActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityVariant = (priority: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getCategoryLabel = (category: string | null) => {
    switch (category) {
      case 'engineering':
        return t('investigation.actions.categories.engineering', 'Engineering');
      case 'administrative':
        return t('investigation.actions.categories.administrative', 'Administrative');
      case 'ppe':
        return t('investigation.actions.categories.ppe', 'PPE');
      case 'training':
        return t('investigation.actions.categories.training', 'Training');
      case 'procedure_update':
        return t('investigation.actions.categories.procedureUpdate', 'Procedure Update');
      default:
        return category || '-';
    }
  };

  const getLinkedCauseText = (linkedId: string | null, causeType: string | null) => {
    if (!linkedId) return null;
    if (causeType === 'contributing_factor') {
      const factor = contributingFactors.find(c => c.id === linkedId);
      return factor?.text;
    }
    const cause = rootCauses.find(c => c.id === linkedId);
    return cause?.text;
  };

  const getLinkedCauseLabel = (causeType: string | null) => {
    if (causeType === 'contributing_factor') {
      return t('investigation.rca.contributingFactor', 'Contributing Factor');
    }
    return t('investigation.rca.rootCause', 'Root Cause');
  };


  return {
    t, direction, isLocked,
    dialogOpen, setDialogOpen,
    expandedActions, setExpandedActions,
    selectedDepartmentId, setSelectedDepartmentId,
    isAISuggesting, setIsAISuggesting,
    editingAction, setEditingAction,
    deleteConfirmId, setDeleteConfirmId,
    
    actions, isLoading, investigation, incident,
    departments, departmentUsers, allUsers,
    createAction, updateAction, deleteAction,
    
    rootCauses, contributingFactors, form,
    selectedCauseType, selectedCauseId, causesForSelection, selectedCause, usersForAssignment,
    
    handleAISuggestAction, onSubmit, handleCloseDialog,
    handleEditAction, handleDeleteAction, toggleActionExpand,
    getStatusIcon, getPriorityVariant, getCategoryLabel,
    getLinkedCauseText, getLinkedCauseLabel
  };
}


