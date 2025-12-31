import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeptRepEvent {
  id: string;
  reference_id: string;
  title: string;
  event_type: string;
  severity: string;
  status: string;
  reported_at: string;
  reporter_name: string;
  department_name: string;
  total_actions: number;
  completed_actions: number;
  overdue_actions: number;
  earliest_due_date: string | null;
  sla_status: 'overdue' | 'at_risk' | 'on_track' | 'completed' | 'pending';
  days_overdue: number;
}

export interface UseDeptRepEventsOptions {
  status?: 'all' | 'pending' | 'in_progress' | 'overdue' | 'completed';
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch department representative events with filters
 * Returns events scoped to the user's assigned department with SLA status
 */
export function useDeptRepEvents(options: UseDeptRepEventsOptions = {}) {
  const { status = 'all', search = '', limit = 50, offset = 0 } = options;

  return useQuery({
    queryKey: ['dept-rep-events', status, search, limit, offset],
    queryFn: async (): Promise<DeptRepEvent[]> => {
      const { data, error } = await supabase.rpc('get_dept_rep_events', {
        p_status: status,
        p_search: search,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        console.error('Error fetching dept rep events:', error);
        throw error;
      }

      return (data as unknown as DeptRepEvent[]) || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 10 * 60 * 1000,
  });
}
