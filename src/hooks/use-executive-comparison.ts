import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subMonths, format } from "date-fns";
import { ExecutiveSummaryData } from "./use-executive-summary";

export interface MonthlyComparisonData {
  currentMonth: ExecutiveSummaryData | null;
  previousMonth: ExecutiveSummaryData | null;
  changes: {
    incidents: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    observations: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    actionsCompleted: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    compliance: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    closureTime: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    overdueRate: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
  };
}

function calculateChange(current: number, previous: number): { value: number; percentage: number; trend: 'up' | 'down' | 'stable' } {
  const value = current - previous;
  const percentage = previous > 0 ? Math.round((value / previous) * 100) : 0;
  const trend = value > 0 ? 'up' : value < 0 ? 'down' : 'stable';
  return { value, percentage, trend };
}

export function useExecutiveComparison(selectedMonth: Date) {
  const { profile } = useAuth();
  const previousMonthDate = subMonths(selectedMonth, 1);

  return useQuery({
    queryKey: ['executive-comparison', profile?.tenant_id, format(selectedMonth, 'yyyy-MM')],
    queryFn: async (): Promise<MonthlyComparisonData> => {
      if (!profile?.tenant_id) {
        return {
          currentMonth: null,
          previousMonth: null,
          changes: {
            incidents: { value: 0, percentage: 0, trend: 'stable' },
            observations: { value: 0, percentage: 0, trend: 'stable' },
            actionsCompleted: { value: 0, percentage: 0, trend: 'stable' },
            compliance: { value: 0, percentage: 0, trend: 'stable' },
            closureTime: { value: 0, percentage: 0, trend: 'stable' },
            overdueRate: { value: 0, percentage: 0, trend: 'stable' },
          }
        };
      }

      // Fetch current month
      const { data: currentData, error: currentError } = await supabase.rpc('get_monthly_hsse_summary', {
        p_tenant_id: profile.tenant_id,
        p_month: format(selectedMonth, 'yyyy-MM-dd'),
      });

      if (currentError) throw currentError;

      // Fetch previous month
      const { data: previousData, error: previousError } = await supabase.rpc('get_monthly_hsse_summary', {
        p_tenant_id: profile.tenant_id,
        p_month: format(previousMonthDate, 'yyyy-MM-dd'),
      });

      if (previousError) throw previousError;

      const current = currentData as unknown as ExecutiveSummaryData;
      const previous = previousData as unknown as ExecutiveSummaryData;

      // Calculate changes
      const changes = {
        incidents: calculateChange(
          current?.incidents?.total || 0, 
          previous?.incidents?.total || 0
        ),
        observations: calculateChange(
          current?.incidents?.observations_count || 0, 
          previous?.incidents?.observations_count || 0
        ),
        actionsCompleted: calculateChange(
          current?.actions?.completed || 0, 
          previous?.actions?.completed || 0
        ),
        compliance: calculateChange(
          current?.inspections?.avg_compliance_percentage || 0, 
          previous?.inspections?.avg_compliance_percentage || 0
        ),
        closureTime: calculateChange(
          current?.incidents?.avg_closure_days || 0, 
          previous?.incidents?.avg_closure_days || 0
        ),
        overdueRate: calculateChange(
          current?.actions?.overdue || 0, 
          previous?.actions?.overdue || 0
        ),
      };

      return {
        currentMonth: current,
        previousMonth: previous,
        changes,
      };
    },
    enabled: !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000,
  });
}
