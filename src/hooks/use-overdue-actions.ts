import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OverdueAction {
  id: string;
  reference_id: string | null;
  title: string;
  description: string | null;
  due_date: string;
  priority: string | null;
  status: string | null;
  days_overdue: number;
  incident_id: string | null;
  session_id: string | null;
  source_type: string | null;
  incident_reference?: string;
  session_reference?: string;
  assigned_to: string | null;
  assignee_name?: string;
}

export function useOverdueActions(limit: number = 10) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['overdue-actions', profile?.tenant_id, limit],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const today = new Date().toISOString().split('T')[0];

      // Fetch overdue corrective actions
      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          id,
          reference_id,
          title,
          description,
          due_date,
          priority,
          status,
          incident_id,
          session_id,
          source_type,
          assigned_to,
          incidents!corrective_actions_incident_id_fkey(reference_id),
          inspection_sessions!corrective_actions_session_id_fkey(reference_id),
          profiles!corrective_actions_assigned_to_fkey(full_name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .not('status', 'in', '("completed","verified","closed")')
        .lt('due_date', today)
        .order('due_date', { ascending: true })
        .limit(limit);

      if (error) throw error;

      // Calculate days overdue and map data
      return (data || []).map(action => {
        const dueDate = new Date(action.due_date);
        const now = new Date();
        const diffTime = now.getTime() - dueDate.getTime();
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: action.id,
          reference_id: action.reference_id,
          title: action.title,
          description: action.description,
          due_date: action.due_date,
          priority: action.priority,
          status: action.status,
          days_overdue: daysOverdue,
          incident_id: action.incident_id,
          session_id: action.session_id,
          source_type: action.source_type,
          incident_reference: (action.incidents as { reference_id?: string } | null)?.reference_id,
          session_reference: (action.inspection_sessions as { reference_id?: string } | null)?.reference_id,
          assigned_to: action.assigned_to,
          assignee_name: (action.profiles as { full_name?: string } | null)?.full_name,
        } as OverdueAction;
      });
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useOverdueActionsCount() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['overdue-actions-count', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return 0;

      const today = new Date().toISOString().split('T')[0];

      const { count, error } = await supabase
        .from('corrective_actions')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .not('status', 'in', '("completed","verified","closed")')
        .lt('due_date', today);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60 * 1000,
  });
}
