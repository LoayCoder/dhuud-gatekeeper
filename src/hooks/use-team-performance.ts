import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AssigneeMetrics {
  assigned_to: string | null;
  assignee_name: string;
  department_name: string | null;
  total_actions: number;
  completed_actions: number;
  verified_actions: number;
  overdue_actions: number;
  sla_breaches: number;
  completion_rate: number;
  sla_compliance_rate: number;
  avg_resolution_days: number;
}

export interface DepartmentMetrics {
  department_id: string;
  department_name: string;
  total_actions: number;
  completed_actions: number;
  sla_breaches: number;
  completion_rate: number;
  sla_compliance_rate: number;
  avg_resolution_days: number;
}

export interface TeamPerformanceData {
  assignees: AssigneeMetrics[];
  departments: DepartmentMetrics[];
  period: {
    start_date: string;
    end_date: string;
  };
}

export function useTeamPerformance(startDate?: Date, endDate?: Date) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['team-performance', profile?.tenant_id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;

      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      const { data, error } = await supabase.rpc('get_team_performance_metrics', {
        p_tenant_id: profile.tenant_id,
        p_start_date: start.toISOString().split('T')[0],
        p_end_date: end.toISOString().split('T')[0],
      });

      if (error) throw error;
      return data as unknown as TeamPerformanceData;
    },
    enabled: !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000,
  });
}
