import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBranchFilter } from '@/hooks/use-branch-filter';

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

// Maps real DB subtypes to severity categories
function classifySubtype(subtype: string | null): keyof IncidentMetricsBySeverity | null {
  switch (subtype) {
    case 'fatality':
      return 'fatality';
    case 'lost_time':
    case 'lost_time_injury':
    case 'fall_from_height':
    case 'slip_trip_fall_same_level':
    case 'struck_by':
      return 'lost_time_injury';
    case 'restricted_work':
    case 'restricted_duty':
      return 'restricted_work';
    case 'medical_treatment':
      return 'medical_treatment';
    case 'first_aid':
      return 'first_aid';
    case 'near_miss':
      return 'near_miss';
    case 'environmental':
    case 'utility_outage':
    case 'chemical_spill':
      return 'environmental';
    case 'vehicle':
    case 'equipment':
    case 'equipment_damage':
      return 'vehicle_equipment';
    case 'security':
    case 'unauthorized_access':
      return 'security';
    default:
      // Catch-all: count as near_miss so no incident is silently dropped
      return subtype ? 'near_miss' : null;
  }
}

// Filters to event_type='incident' only, with branch filter race-condition fix
export function useIncidentMetricsBySeverity(
  startDate: string,
  endDate: string,
  branchId?: string,
  siteId?: string
) {
  const { branchIds, isAllBranchesMode, isLoading: branchLoading, queryKey: branchQueryKey } = useBranchFilter();
  
  const effectiveBranchIds = branchId ? [branchId] : branchIds;
  const shouldFilterByBranch = branchId ? true : !isAllBranchesMode;

  return useQuery({
    queryKey: ['incident-metrics-severity', ...branchQueryKey, startDate, endDate, branchId, siteId],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select('injury_classification, event_type, subtype')
        .eq('event_type', 'incident')
        .gte('occurred_at', startDate)
        .lte('occurred_at', endDate)
        .is('deleted_at', null);

      if (shouldFilterByBranch && effectiveBranchIds && effectiveBranchIds.length > 0) {
        if (effectiveBranchIds.length === 1) {
          query = query.eq('branch_id', effectiveBranchIds[0]);
        } else {
          query = query.in('branch_id', effectiveBranchIds);
        }
      }
      if (siteId) query = query.eq('site_id', siteId);

      const { data, error } = await query;
      if (error) throw error;

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
        const classification = incident.injury_classification || incident.subtype;
        const category = classifySubtype(classification);
        if (category) {
          metrics[category]++;
        }
      });

      return metrics;
    },
    enabled: !branchLoading,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIncidentFrequencyTrend(
  startDate: string,
  endDate: string,
  branchId?: string,
  siteId?: string
) {
  const { branchIds, isAllBranchesMode, isLoading: branchLoading, queryKey: branchQueryKey } = useBranchFilter();
  
  const effectiveBranchIds = branchId ? [branchId] : branchIds;
  const shouldFilterByBranch = branchId ? true : !isAllBranchesMode;

  return useQuery({
    queryKey: ['incident-frequency-trend', ...branchQueryKey, startDate, endDate, branchId, siteId],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select('occurred_at')
        .eq('event_type', 'incident')
        .gte('occurred_at', startDate)
        .lte('occurred_at', endDate)
        .is('deleted_at', null)
        .not('occurred_at', 'is', null);

      if (shouldFilterByBranch && effectiveBranchIds && effectiveBranchIds.length > 0) {
        if (effectiveBranchIds.length === 1) {
          query = query.eq('branch_id', effectiveBranchIds[0]);
        } else {
          query = query.in('branch_id', effectiveBranchIds);
        }
      }
      if (siteId) query = query.eq('site_id', siteId);

      const { data, error } = await query;
      if (error) throw error;

      const monthCounts: Record<string, number> = {};
      (data ?? []).forEach((incident) => {
        if (incident.occurred_at) {
          const month = incident.occurred_at.substring(0, 7);
          monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
      });

      const trend: IncidentTrendDataPoint[] = Object.entries(monthCounts)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return trend;
    },
    enabled: !branchLoading,
    staleTime: 5 * 60 * 1000,
  });
}
