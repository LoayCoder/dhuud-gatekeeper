import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { InvestigationTeamTask } from './types';

export function useInvestigationTeamTasks(investigationId: string | null) {
    return useQuery({
        queryKey: ['investigation-team-tasks', investigationId],
        queryFn: async () => {
            if (!investigationId) return [];
            const { data, error } = await supabase.from('investigation_team_tasks').select(`*, assignee:profiles!investigation_team_tasks_assigned_to_fkey(id, full_name), assigner:profiles!investigation_team_tasks_assigned_by_fkey(id, full_name)`).eq('investigation_id', investigationId).is('deleted_at', null).order('created_at', { ascending: false });
            if (error) throw error;
            return data as InvestigationTeamTask[];
        },
        enabled: !!investigationId,
    });
}

export function useMyInvestigationTasks() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['my-investigation-tasks', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase.from('investigation_team_tasks').select(`*, investigation:investigations!inner(id, incident:incidents!inner(id, reference_id, title)), assigner:profiles!investigation_team_tasks_assigned_by_fkey(id, full_name)`).eq('assigned_to', user.id).is('deleted_at', null).neq('status', 'completed').order('priority', { ascending: false }).order('due_date', { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });
}

export function useIsTeamLeader(investigationId: string | null) {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['is-team-leader', user?.id, investigationId],
        queryFn: async () => {
            if (!user?.id || !investigationId) return false;
            const { data, error } = await supabase.from('investigations').select('team_leader_id').eq('id', investigationId).single();
            if (error) return false;
            return data?.team_leader_id === user.id;
        },
        enabled: !!user?.id && !!investigationId,
    });
}
