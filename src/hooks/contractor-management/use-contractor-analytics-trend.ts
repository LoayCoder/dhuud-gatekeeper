import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface MonthlyTrendData {
  month: string;
  passes: number;
}

export function useContractorAnalyticsTrend(monthsBack: number = 6) {
  return useQuery({
    queryKey: ["contractor-analytics-trend", monthsBack],
    queryFn: async () => {
      const now = new Date();
      const monthlyData: MonthlyTrendData[] = [];

      // Generate array of last N months
      for (let i = monthsBack - 1; i >= 0; i--) {
        const targetMonth = subMonths(now, i);
        const monthStart = startOfMonth(targetMonth);
        const monthEnd = endOfMonth(targetMonth);

        // Query gate passes for this month
        const { count, error } = await supabase
          .from("material_gate_passes")
          .select("id", { count: "exact", head: true })
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString())
          .is("deleted_at", null);

        if (error) {
          console.error("Error fetching gate pass trend:", error);
        }

        monthlyData.push({
          month: format(targetMonth, "MMM"),
          passes: count ?? 0,
        });
      }

      return monthlyData;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
