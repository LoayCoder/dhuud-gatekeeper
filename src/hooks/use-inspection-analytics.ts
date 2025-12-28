import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subDays, format } from 'date-fns';

export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'custom';

export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  startDate?: Date;
  endDate?: Date;
  siteId?: string;
}

export interface InspectionAnalytics {
  sessions: {
    total: number;
    by_status: Record<string, number>;
  };
  findings: {
    total: number;
    by_classification: Record<string, number>;
    by_status: Record<string, number>;
  };
  sla_compliance: {
    on_time: number;
    overdue: number;
    total_with_due: number;
  };
  completion_rate: number;
}

function getDateRange(period: AnalyticsPeriod, startDate?: Date, endDate?: Date) {
  const now = new Date();
  
  switch (period) {
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 0 }),
        end: endOfWeek(now, { weekStartsOn: 0 }),
      };
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    case 'quarter':
      return {
        start: startOfQuarter(now),
        end: endOfQuarter(now),
      };
    case 'custom':
      return {
        start: startDate || subDays(now, 30),
        end: endDate || now,
      };
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
  }
}

/**
 * Hook to fetch inspection analytics using RPC function
 */
export function useInspectionAnalytics(filters: AnalyticsFilters) {
  const { tenantId } = useAuth();
  const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);

  return useQuery({
    queryKey: ['inspection-analytics', tenantId, filters.period, start, end, filters.siteId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase.rpc('get_inspection_analytics', {
        p_tenant_id: tenantId,
        p_start_date: format(start, 'yyyy-MM-dd'),
        p_end_date: format(end, 'yyyy-MM-dd'),
        p_site_id: filters.siteId || null,
      });

      if (error) {
        console.error('Error fetching analytics:', error);
        throw error;
      }

      return data as unknown as InspectionAnalytics;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

/**
 * Hook to fetch session trend data over time
 */
export function useSessionTrend(filters: AnalyticsFilters) {
  const { tenantId } = useAuth();
  const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);

  return useQuery({
    queryKey: ['session-trend', tenantId, start, end, filters.siteId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('inspection_sessions')
        .select('id, status, created_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (filters.siteId) {
        query = query.eq('site_id', filters.siteId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching session trend:', error);
        throw error;
      }

      // Group by date
      const byDate: Record<string, { total: number; completed: number }> = {};
      (data || []).forEach((session) => {
        const date = format(new Date(session.created_at), 'yyyy-MM-dd');
        if (!byDate[date]) {
          byDate[date] = { total: 0, completed: 0 };
        }
        byDate[date].total++;
        if (['completed_with_open_actions', 'closed'].includes(session.status)) {
          byDate[date].completed++;
        }
      });

      return Object.entries(byDate).map(([date, counts]) => ({
        date,
        ...counts,
        rate: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
      }));
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

/**
 * Hook to fetch findings trend data
 */
export function useFindingsTrend(filters: AnalyticsFilters) {
  const { tenantId } = useAuth();
  const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);

  return useQuery({
    queryKey: ['findings-trend', tenantId, start, end, filters.siteId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('area_inspection_findings')
        .select('id, classification, status, created_at, session:inspection_sessions!inner(site_id)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) {
        console.error('Error fetching findings trend:', error);
        throw error;
      }

      // Filter by site if needed
      let filtered = data || [];
      if (filters.siteId) {
        filtered = filtered.filter((f: any) => f.session?.site_id === filters.siteId);
      }

      // Group by date and classification
      const byDate: Record<string, Record<string, number>> = {};
      filtered.forEach((finding: any) => {
        const date = format(new Date(finding.created_at), 'yyyy-MM-dd');
        if (!byDate[date]) {
          byDate[date] = { critical: 0, major: 0, minor: 0, observation: 0 };
        }
        const classification = finding.classification?.toLowerCase() || 'observation';
        byDate[date][classification] = (byDate[date][classification] || 0) + 1;
      });

      return Object.entries(byDate).map(([date, classifications]) => ({
        date,
        ...classifications,
        total: Object.values(classifications).reduce((a, b) => a + b, 0),
      }));
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

/**
 * Hook to fetch top failing items
 */
export function useTopFailingItems(filters: AnalyticsFilters, limit = 10) {
  const { tenantId } = useAuth();
  const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);

  return useQuery({
    queryKey: ['top-failing-items', tenantId, start, end, filters.siteId, limit],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('area_inspection_responses')
        .select(`
          template_item_id,
          result,
          template_item:inspection_template_items(question_text, question_text_ar, category)
        `)
        .eq('tenant_id', tenantId)
        .eq('result', 'FAIL')
        .is('deleted_at', null)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) {
        console.error('Error fetching top failing items:', error);
        throw error;
      }

      // Count failures per template item
      const counts: Record<string, { count: number; item: any }> = {};
      (data || []).forEach((response: any) => {
        const itemId = response.template_item_id;
        if (!counts[itemId]) {
          counts[itemId] = { count: 0, item: response.template_item };
        }
        counts[itemId].count++;
      });

      return Object.entries(counts)
        .map(([id, { count, item }]) => ({
          id,
          question: item?.question_text || 'Unknown',
          question_ar: item?.question_text_ar,
          category: item?.category,
          failureCount: count,
        }))
        .sort((a, b) => b.failureCount - a.failureCount)
        .slice(0, limit);
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}
