import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import type { AssignInvestigationTeamInput, AssignTeamTaskInput, CompleteTaskInput } from './types';

export function useAssignInvestigationTeam() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user } = useAuth(); const { t } = useTranslation();
    return useMutation({
        mutationFn: async (input: AssignInvestigationTeamInput) => {
            if (!user?.id) throw new Error('User not authenticated');
            const { data, error } = await supabase.rpc('assign_investigation_team', { _incident_id: input.incidentId, _user_id: user.id, _investigation_type: input.investigationType, _investigator_id: input.investigatorId || null, _team_leader_id: input.teamLeaderId || null, _team_member_ids: input.teamMemberIds || null, _assignment_notes: input.assignmentNotes || null });
            if (error) throw error;
            const result = data as { success: boolean; error?: string; investigation_type?: string; severity_level?: number };
            if (!result.success) throw new Error(result.error || 'Failed to assign investigation team');
            try { await supabase.functions.invoke('send-workflow-notification', { body: { incidentId: input.incidentId, action: 'investigation_team_assigned', investigationType: input.investigationType, teamLeaderId: input.teamLeaderId, teamMemberIds: input.teamMemberIds, investigatorId: input.investigatorId } }); } catch (e) { console.error('Failed to send notification:', e); }
            return result;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] }); queryClient.invalidateQueries({ queryKey: ['investigation'] });
            toast({ title: t('workflow.team.assigned', 'Investigation Team Assigned'), description: variables.investigationType === 'team' ? t('workflow.team.teamAssignedDesc', 'Team leader and members have been notified') : t('workflow.team.investigatorAssignedDesc', 'Investigator has been notified') });
        },
        onError: (error) => { toast({ title: t('common.error', 'Error'), description: error.message, variant: "destructive" }); },
    });
}

export function useAssignTeamTask() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user } = useAuth(); const { t } = useTranslation();
    return useMutation({
        mutationFn: async (input: AssignTeamTaskInput) => {
            if (!user?.id) throw new Error('User not authenticated');
            const { data, error } = await supabase.rpc('assign_team_task', { p_task_id: input.investigationId, p_assigned_by: user.id, p_assignee_id: input.assignedTo, p_task_type: input.taskType, p_description: input.taskDescription, p_notes: input.targetArea || null, p_due_date: input.dueDate || new Date().toISOString().split('T')[0], p_priority: input.priority || 'medium' });
            if (error) throw error;
            const result = data as { success: boolean; error?: string; task_id?: string };
            if (!result.success) throw new Error(result.error || 'Failed to assign task');
            return result;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['investigation-team-tasks'] }); queryClient.invalidateQueries({ queryKey: ['my-investigation-tasks'] }); toast({ title: t('workflow.team.taskAssigned', 'Task Assigned'), description: t('workflow.team.taskAssignedDesc', 'Team member has been notified of the new task') }); },
        onError: (error) => { toast({ title: t('common.error', 'Error'), description: error.message, variant: "destructive" }); },
    });
}

export function useCompleteTeamTask() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user } = useAuth(); const { t } = useTranslation();
    return useMutation({
        mutationFn: async (input: CompleteTaskInput) => {
            if (!user?.id) throw new Error('User not authenticated');
            const { data, error } = await supabase.rpc('complete_team_task', { _task_id: input.taskId, _user_id: user.id, _completion_notes: input.completionNotes || null });
            if (error) throw error;
            const result = data as { success: boolean; error?: string };
            if (!result.success) throw new Error(result.error || 'Failed to complete task');
            return result;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['investigation-team-tasks'] }); queryClient.invalidateQueries({ queryKey: ['my-investigation-tasks'] }); toast({ title: t('workflow.team.taskCompleted', 'Task Completed'), description: t('workflow.team.taskCompletedDesc', 'Task has been marked as complete') }); },
        onError: (error) => { toast({ title: t('common.error', 'Error'), description: error.message, variant: "destructive" }); },
    });
}
