import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type QuickActionType = 'pending_approvals' | 'open_investigations' | 'overdue_actions' | 'my_actions';

export interface QuickActionItem {
  id: string;
  reference_id: string;
  title: string;
  status: string;
  due_date?: string;
  severity?: string;
  type: 'incident' | 'action';
  created_at?: string;
}

export function useQuickActionDrilldown(actionType: QuickActionType | null) {
  const { profile, user } = useAuth();

  return useQuery({
    queryKey: ['quick-action-drilldown', actionType, profile?.tenant_id],
    queryFn: async (): Promise<QuickActionItem[]> => {
      if (!actionType || !user?.id) return [];

      switch (actionType) {
        case 'pending_approvals': {
          // Fetch incidents pending user's approval
          const { data, error } = await supabase
            .from('incidents')
            .select('id, reference_id, title, status, severity, created_at')
            .is('deleted_at', null)
            .or(`status.eq.pending_manager_approval,status.eq.pending_dept_rep_approval,status.eq.pending_closure,status.eq.pending_final_closure`)
            .order('created_at', { ascending: false })
            .limit(20);
          
          if (error) throw error;
          
          return (data || []).map(item => ({
            id: item.id,
            reference_id: item.reference_id || '-',
            title: item.title,
            status: item.status,
            severity: item.severity,
            type: 'incident' as const,
            created_at: item.created_at,
          }));
        }
        
        case 'open_investigations': {
          // Fetch open investigations
          const { data, error } = await supabase
            .from('incidents')
            .select('id, reference_id, title, status, severity, created_at')
            .is('deleted_at', null)
            .in('status', ['investigation_in_progress', 'investigation_pending'])
            .order('created_at', { ascending: false })
            .limit(20);
          
          if (error) throw error;
          
          return (data || []).map(item => ({
            id: item.id,
            reference_id: item.reference_id || '-',
            title: item.title,
            status: item.status,
            severity: item.severity,
            type: 'incident' as const,
            created_at: item.created_at,
          }));
        }
        
        case 'overdue_actions': {
          // Fetch overdue corrective actions
          const { data, error } = await supabase
            .from('corrective_actions')
            .select('id, reference_id, title, status, priority, due_date, created_at')
            .is('deleted_at', null)
            .not('status', 'in', '("verified","closed","rejected")')
            .lt('due_date', new Date().toISOString().split('T')[0])
            .order('due_date', { ascending: true })
            .limit(20);
          
          if (error) throw error;
          
          return (data || []).map(item => ({
            id: item.id,
            reference_id: item.reference_id || '-',
            title: item.title,
            status: item.status,
            severity: item.priority,
            due_date: item.due_date,
            type: 'action' as const,
            created_at: item.created_at,
          }));
        }
        
        case 'my_actions': {
          // Fetch actions assigned to current user
          const { data, error } = await supabase
            .from('corrective_actions')
            .select('id, reference_id, title, status, priority, due_date, created_at')
            .is('deleted_at', null)
            .eq('assigned_to', user.id)
            .not('status', 'in', '("verified","closed","rejected")')
            .order('due_date', { ascending: true })
            .limit(20);
          
          if (error) throw error;
          
          return (data || []).map(item => ({
            id: item.id,
            reference_id: item.reference_id || '-',
            title: item.title,
            status: item.status,
            severity: item.priority,
            due_date: item.due_date,
            type: 'action' as const,
            created_at: item.created_at,
          }));
        }
        
        default:
          return [];
      }
    },
    enabled: !!actionType && !!profile?.tenant_id,
    staleTime: 30 * 1000,
  });
}
