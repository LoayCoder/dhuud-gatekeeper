import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IncidentMetricsBySeverity {
  fatality: number;
  lost_time_injury: number;
  restricted_work: number;
  medical_treatment: number;
  first_aid: number;
  near_miss: number;
  environmental: number;
  vehicle_equipment: number;
  security: number;
}

export interface IncidentTrendDataPoint {
  month: string;
  count: number;
}

// Query incidents directly instead of using RPC (RPC doesn't exist yet)
export function useIncidentMetricsBySeverity(
  startDate: string,
  endDate: string,
  branchId?: string,
  siteId?: string
) {
  return useQuery({
    queryKey: ['incident-metrics-severity', startDate, endDate, branchId, siteId],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select('injury_classification, event_type, subtype')
        .gte('occurred_at', startDate)
        .lte('occurred_at', endDate)
        .is('deleted_at', null);

      if (branchId) query = query.eq('branch_id', branchId);
      if (siteId) query = query.eq('site_id', siteId);

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate metrics from raw data
      const metrics: IncidentMetricsBySeverity = {
        fatality: 0,
        lost_time_injury: 0,
        restricted_work: 0,
        medical_treatment: 0,
        first_aid: 0,
        near_miss: 0,
        environmental: 0,
        vehicle_equipment: 0,
        security: 0,
      };

      (data ?? []).forEach((incident) => {
        // Count by injury classification
        switch (incident.injury_classification) {
          case 'fatality':
            metrics.fatality++;
            break;
          case 'lost_time':
          case 'lost_time_injury':
            metrics.lost_time_injury++;
            break;
          case 'restricted_work':
          case 'restricted_duty':
            metrics.restricted_work++;
            break;
          case 'medical_treatment':
            metrics.medical_treatment++;
            break;
          case 'first_aid':
            metrics.first_aid++;
            break;
        }

        // Count by event type
        if (incident.event_type === 'observation' && incident.subtype === 'near_miss') {
          metrics.near_miss++;
        }
        if (incident.subtype === 'environmental' || incident.event_type === 'environmental') {
          metrics.environmental++;
        }
        if (incident.subtype === 'vehicle' || incident.subtype === 'equipment') {
          metrics.vehicle_equipment++;
        }
        if (incident.subtype === 'security' || incident.event_type === 'security') {
          metrics.security++;
        }
      });

      return metrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useIncidentFrequencyTrend(
  startDate: string,
  endDate: string,
  branchId?: string,
  siteId?: string
) {
  return useQuery({
    queryKey: ['incident-frequency-trend', startDate, endDate, branchId, siteId],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select('occurred_at')
        .gte('occurred_at', startDate)
        .lte('occurred_at', endDate)
        .is('deleted_at', null)
        .not('occurred_at', 'is', null);

      if (branchId) query = query.eq('branch_id', branchId);
      if (siteId) query = query.eq('site_id', siteId);

      const { data, error } = await query;
      if (error) throw error;

      // Group by month
      const monthCounts: Record<string, number> = {};
      (data ?? []).forEach((incident) => {
        if (incident.occurred_at) {
          const month = incident.occurred_at.substring(0, 7); // YYYY-MM
          monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
      });

      // Convert to array sorted by month
      const trend: IncidentTrendDataPoint[] = Object.entries(monthCounts)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return trend;
    },
    staleTime: 5 * 60 * 1000,
  });
}
