import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface IncidentSummary {
  total: number;
  observations_count: number;
  by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  by_status: {
    submitted: number;
    investigation_in_progress: number;
    closed: number;
  };
  avg_closure_days: number;
}

export interface InspectionSummary {
  sessions_completed: number;
  avg_compliance_percentage: number;
  by_type: {
    asset: number;
    area: number;
    audit: number;
  };
  findings_raised: number;
  findings_closed: number;
}

export interface ActionSummary {
  total_created: number;
  completed: number;
  verified: number;
  overdue: number;
  sla_breach_count: number;
  sla_breach_rate: number;
  avg_resolution_days: number;
}

export interface ExecutiveSummaryData {
  incidents: IncidentSummary;
  inspections: InspectionSummary;
  actions: ActionSummary;
  period: {
    start_date: string;
    end_date: string;
  };
}

export function useExecutiveSummary(month?: Date) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['executive-summary', profile?.tenant_id, month?.toISOString()],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;

      const targetMonth = month || new Date();

      const { data, error } = await supabase.rpc('get_monthly_hsse_summary', {
        p_tenant_id: profile.tenant_id,
        p_month: targetMonth.toISOString().split('T')[0],
      });

      if (error) throw error;
      return data as unknown as ExecutiveSummaryData;
    },
    enabled: !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000,
  });
}
