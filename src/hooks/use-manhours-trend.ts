import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface ManhoursTrendData {
  month: string;
  month_label: string;
  employee_hours: number;
  contractor_hours: number;
  total_hours: number;
}

export function useManhoursTrend(months: number = 12, branchId?: string, siteId?: string) {
  const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const startDate = format(subMonths(startOfMonth(new Date()), months - 1), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['manhours-trend', startDate, endDate, branchId, siteId],
    queryFn: async (): Promise<ManhoursTrendData[]> => {
      let query = supabase
        .from('manhours')
        .select('period_date, employee_hours, contractor_hours')
        .gte('period_date', startDate)
        .lte('period_date', endDate)
        .is('deleted_at', null)
        .order('period_date', { ascending: true });

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }
      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate by month
      const monthlyData = new Map<string, { employee: number; contractor: number }>();

      data?.forEach((record) => {
        const monthKey = format(new Date(record.period_date), 'yyyy-MM');
        const existing = monthlyData.get(monthKey) || { employee: 0, contractor: 0 };
        monthlyData.set(monthKey, {
          employee: existing.employee + Number(record.employee_hours || 0),
          contractor: existing.contractor + Number(record.contractor_hours || 0),
        });
      });

      // Convert to array and format for chart
      const result: ManhoursTrendData[] = [];
      
      // Generate all months in range
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMM yyyy');
        const existing = monthlyData.get(monthKey) || { employee: 0, contractor: 0 };
        
        result.push({
          month: monthKey,
          month_label: monthLabel,
          employee_hours: existing.employee,
          contractor_hours: existing.contractor,
          total_hours: existing.employee + existing.contractor,
        });
      }

      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
