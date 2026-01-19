import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

export type InvestigationType = 'single' | 'team';
export type TaskType = 'evidence_collection' | 'witness_interview' | 'property_assessment' | 'injury_documentation' | 'environmental_assessment' | 'other';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface AssignInvestigationTeamInput {
  incidentId: string;
  investigationType: InvestigationType;
  investigatorId?: string;
  teamLeaderId?: string;
  teamMemberIds?: string[];
  assignmentNotes?: string;
}

interface AssignTeamTaskInput {
  investigationId: string;
  assignedTo: string;
  taskType: TaskType;
  taskDescription: string;
  targetArea?: string;
  dueDate?: string;
  priority?: TaskPriority;
}

interface CompleteTaskInput {
  taskId: string;
  completionNotes?: string;
}

export interface InvestigationTeamTask {
  id: string;
  investigation_id: string;
  assigned_to: string;
  assigned_by: string;
  task_type: TaskType;
  task_description: string;
  target_area: string | null;
  status: TaskStatus;
  notes: string | null;
  completion_notes: string | null;
  completed_at: string | null;
  due_date: string | null;
  priority: TaskPriority;
  created_at: string;
  assignee?: { id: string; full_name: string };
  assigner?: { id: string; full_name: string };
}

/**
 * Hook to assign investigation team (single or team investigation)
 */
export function useAssignInvestigationTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (input: AssignInvestigationTeamInput) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .rpc('assign_investigation_team', {
          _incident_id: input.incidentId,
          _user_id: user.id,
          _investigation_type: input.investigationType,
          _investigator_id: input.investigatorId || null,
          _team_leader_id: input.teamLeaderId || null,
          _team_member_ids: input.teamMemberIds || null,
          _assignment_notes: input.assignmentNotes || null
        });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; investigation_type?: string; severity_level?: number };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to assign investigation team');
      }
      
      // Send notifications
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { 
            incidentId: input.incidentId, 
            action: 'investigation_team_assigned',
            investigationType: input.investigationType,
            teamLeaderId: input.teamLeaderId,
            teamMemberIds: input.teamMemberIds,
            investigatorId: input.investigatorId
          },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['investigation'] });
      
      toast({
        title: t('workflow.team.assigned', 'Investigation Team Assigned'),
        description: variables.investigationType === 'team'
          ? t('workflow.team.teamAssignedDesc', 'Team leader and members have been notified')
          : t('workflow.team.investigatorAssignedDesc', 'Investigator has been notified'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to get investigation team tasks
 */
export function useInvestigationTeamTasks(investigationId: string | null) {
  return useQuery({
    queryKey: ['investigation-team-tasks', investigationId],
    queryFn: async () => {
      if (!investigationId) return [];
      
      const { data, error } = await supabase
        .from('investigation_team_tasks')
        .select(`
          *,
          assignee:profiles!investigation_team_tasks_assigned_to_fkey(id, full_name),
          assigner:profiles!investigation_team_tasks_assigned_by_fkey(id, full_name)
        `)
        .eq('investigation_id', investigationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as InvestigationTeamTask[];
    },
    enabled: !!investigationId,
  });
}

/**
 * Hook for team leader to assign tasks
 */
export function useAssignTeamTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (input: AssignTeamTaskInput) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .rpc('assign_team_task', {
          p_task_id: input.investigationId,
          p_assigned_by: user.id,
          p_assignee_id: input.assignedTo,
          p_task_type: input.taskType,
          p_description: input.taskDescription,
          p_notes: input.targetArea || null,
          p_due_date: input.dueDate || new Date().toISOString().split('T')[0],
          p_priority: input.priority || 'medium'
        });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; task_id?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to assign task');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation-team-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-investigation-tasks'] });
      
      toast({
        title: t('workflow.team.taskAssigned', 'Task Assigned'),
        description: t('workflow.team.taskAssignedDesc', 'Team member has been notified of the new task'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook for team member to complete a task
 */
export function useCompleteTeamTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (input: CompleteTaskInput) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .rpc('complete_team_task', {
          _task_id: input.taskId,
          _user_id: user.id,
          _completion_notes: input.completionNotes || null
        });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to complete task');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation-team-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-investigation-tasks'] });
      
      toast({
        title: t('workflow.team.taskCompleted', 'Task Completed'),
        description: t('workflow.team.taskCompletedDesc', 'Task has been marked as complete'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to get current user's assigned tasks across all investigations
 */
export function useMyInvestigationTasks() {
  const { user, profile } = useAuth();
  
  return useQuery({
    queryKey: ['my-investigation-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('investigation_team_tasks')
        .select(`
          *,
          investigation:investigations!inner(
            id,
            incident:incidents!inner(id, reference_id, title)
          ),
          assigner:profiles!investigation_team_tasks_assigned_by_fkey(id, full_name)
        `)
        .eq('assigned_to', user.id)
        .is('deleted_at', null)
        .neq('status', 'completed')
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook to check if current user is team leader for an investigation
 */
export function useIsTeamLeader(investigationId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['is-team-leader', user?.id, investigationId],
    queryFn: async () => {
      if (!user?.id || !investigationId) return false;
      
      const { data, error } = await supabase
        .from('investigations')
        .select('team_leader_id')
        .eq('id', investigationId)
        .single();
      
      if (error) return false;
      return data?.team_leader_id === user.id;
    },
    enabled: !!user?.id && !!investigationId,
  });
}
