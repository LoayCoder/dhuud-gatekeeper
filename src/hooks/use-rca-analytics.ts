import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SeverityLevelV2 } from "@/lib/hsse-severity-levels";

interface RootCauseItem {
  id: string;
  text: string;
}

interface ContributingFactorItem {
  id: string;
  text: string;
}

export interface RootCauseDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface CauseFlowData {
  immediate_causes: { text: string; count: number }[];
  underlying_causes: { text: string; count: number }[];
  root_causes: { text: string; count: number }[];
  flows: { from: string; to: string; count: number; type: 'immediate_to_underlying' | 'underlying_to_root' }[];
}

export interface MajorEventItem {
  id: string;
  reference_id: string;
  title: string;
  severity: SeverityLevelV2;
  occurred_at: string;
  status: string;
  event_type: string;
  location?: string;
  branch_name?: string;
}

export interface RCAAnalyticsData {
  root_cause_distribution: RootCauseDistribution[];
  cause_flow: CauseFlowData;
  major_events: MajorEventItem[];
  total_investigations: number;
  completed_investigations: number;
}

// Helper to categorize root causes
function categorizeRootCause(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('training') || lowerText.includes('competenc') || lowerText.includes('skill')) {
    return 'Training & Competency';
  }
  if (lowerText.includes('procedure') || lowerText.includes('policy') || lowerText.includes('standard')) {
    return 'Procedures & Standards';
  }
  if (lowerText.includes('equipment') || lowerText.includes('tool') || lowerText.includes('machine')) {
    return 'Equipment & Tools';
  }
  if (lowerText.includes('communication') || lowerText.includes('inform')) {
    return 'Communication';
  }
  if (lowerText.includes('supervision') || lowerText.includes('management') || lowerText.includes('leadership')) {
    return 'Supervision & Management';
  }
  if (lowerText.includes('maintenance') || lowerText.includes('repair')) {
    return 'Maintenance';
  }
  if (lowerText.includes('ppe') || lowerText.includes('protective') || lowerText.includes('safety gear')) {
    return 'PPE & Safety Equipment';
  }
  if (lowerText.includes('design') || lowerText.includes('engineering')) {
    return 'Design & Engineering';
  }
  if (lowerText.includes('human') || lowerText.includes('error') || lowerText.includes('fatigue')) {
    return 'Human Factors';
  }
  if (lowerText.includes('environment') || lowerText.includes('weather') || lowerText.includes('condition')) {
    return 'Environmental Conditions';
  }
  
  return 'Other';
}

export function useRCAAnalytics(startDate?: Date, endDate?: Date) {
  const { profile } = useAuth();

  const query = useQuery({
    queryKey: ['rca-analytics', profile?.tenant_id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<RCAAnalyticsData> => {
      // Fetch investigations with RCA data
      let investigationsQuery = supabase
        .from('investigations')
        .select(`
          id,
          incident_id,
          immediate_cause,
          underlying_cause,
          root_cause,
          root_causes,
          contributing_factors_list,
          completed_at
        `)
        .is('deleted_at', null);

      const { data: investigations, error: invError } = await investigationsQuery;
      if (invError) throw invError;

      // Fetch major events (level_4 and level_5 severity - Major/Catastrophic)
      let eventsQuery = supabase
        .from('incidents')
        .select(`
          id,
          reference_id,
          title,
          severity_v2,
          occurred_at,
          status,
          event_type,
          location,
          branches:branch_id(name)
        `)
        .is('deleted_at', null)
        .in('severity_v2', ['level_5', 'level_4'])
        .order('occurred_at', { ascending: false })
        .limit(20);

      if (startDate) {
        eventsQuery = eventsQuery.gte('occurred_at', startDate.toISOString());
      }
      if (endDate) {
        eventsQuery = eventsQuery.lte('occurred_at', endDate.toISOString());
      }

      const { data: majorEvents, error: eventsError } = await eventsQuery;
      if (eventsError) throw eventsError;

      // Process root cause distribution
      const rootCauseCounts: Record<string, number> = {};
      const immediateCauseCounts: Record<string, number> = {};
      const underlyingCauseCounts: Record<string, number> = {};
      const flows: { from: string; to: string; count: number; type: 'immediate_to_underlying' | 'underlying_to_root' }[] = [];

      investigations?.forEach(inv => {
        // Process root causes
        const rootCauses = inv.root_causes as unknown as RootCauseItem[] | null;
        if (rootCauses && Array.isArray(rootCauses)) {
          rootCauses.forEach(rc => {
            const category = categorizeRootCause(rc.text);
            rootCauseCounts[category] = (rootCauseCounts[category] || 0) + 1;
          });
        } else if (inv.root_cause) {
          const category = categorizeRootCause(inv.root_cause);
          rootCauseCounts[category] = (rootCauseCounts[category] || 0) + 1;
        }

        // Process immediate causes
        if (inv.immediate_cause) {
          const category = categorizeRootCause(inv.immediate_cause);
          immediateCauseCounts[category] = (immediateCauseCounts[category] || 0) + 1;
        }

        // Process underlying causes
        if (inv.underlying_cause) {
          const category = categorizeRootCause(inv.underlying_cause);
          underlyingCauseCounts[category] = (underlyingCauseCounts[category] || 0) + 1;
        }
      });

      // Build cause flow connections
      const flowMap: Record<string, number> = {};
      investigations?.forEach(inv => {
        if (inv.immediate_cause && inv.underlying_cause) {
          const immCat = categorizeRootCause(inv.immediate_cause);
          const undCat = categorizeRootCause(inv.underlying_cause);
          const key = `${immCat}|${undCat}|immediate_to_underlying`;
          flowMap[key] = (flowMap[key] || 0) + 1;
        }

        if (inv.underlying_cause) {
          const undCat = categorizeRootCause(inv.underlying_cause);
          const rootCauses = inv.root_causes as unknown as RootCauseItem[] | null;
          if (rootCauses && Array.isArray(rootCauses)) {
            rootCauses.forEach(rc => {
              const rootCat = categorizeRootCause(rc.text);
              const key = `${undCat}|${rootCat}|underlying_to_root`;
              flowMap[key] = (flowMap[key] || 0) + 1;
            });
          } else if (inv.root_cause) {
            const rootCat = categorizeRootCause(inv.root_cause);
            const key = `${undCat}|${rootCat}|underlying_to_root`;
            flowMap[key] = (flowMap[key] || 0) + 1;
          }
        }
      });

      Object.entries(flowMap).forEach(([key, count]) => {
        const [from, to, type] = key.split('|');
        flows.push({ from, to, count, type: type as 'immediate_to_underlying' | 'underlying_to_root' });
      });

      // Calculate distribution with percentages
      const totalRootCauses = Object.values(rootCauseCounts).reduce((a, b) => a + b, 0);
      const rootCauseDistribution: RootCauseDistribution[] = Object.entries(rootCauseCounts)
        .map(([category, count]) => ({
          category,
          count,
          percentage: totalRootCauses > 0 ? Math.round((count / totalRootCauses) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Format major events with 5-level severity
      const formattedMajorEvents: MajorEventItem[] = (majorEvents || []).map(event => ({
        id: event.id,
        reference_id: event.reference_id || 'N/A',
        title: event.title,
        severity: (event.severity_v2 || 'level_3') as SeverityLevelV2,
        occurred_at: event.occurred_at || '',
        status: event.status || 'submitted',
        event_type: event.event_type,
        location: event.location || undefined,
        branch_name: (event.branches as { name: string } | null)?.name || undefined
      }));

      // Format cause flow data
      const causeFlowData: CauseFlowData = {
        immediate_causes: Object.entries(immediateCauseCounts)
          .map(([text, count]) => ({ text, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6),
        underlying_causes: Object.entries(underlyingCauseCounts)
          .map(([text, count]) => ({ text, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6),
        root_causes: Object.entries(rootCauseCounts)
          .map(([text, count]) => ({ text, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6),
        flows: flows.sort((a, b) => b.count - a.count).slice(0, 15)
      };

      return {
        root_cause_distribution: rootCauseDistribution,
        cause_flow: causeFlowData,
        major_events: formattedMajorEvents,
        total_investigations: investigations?.length || 0,
        completed_investigations: investigations?.filter(i => i.completed_at).length || 0
      };
    },
    enabled: !!profile?.tenant_id,
    // Enhanced caching for better performance
    staleTime: 5 * 60 * 1000,           // 5 minutes - data considered fresh
    gcTime: 30 * 60 * 1000,             // 30 minutes - keep in cache
    refetchOnWindowFocus: true,          // Refresh when user returns to tab
    refetchInterval: 5 * 60 * 1000,      // Background refresh every 5 minutes
    placeholderData: (previousData) => previousData, // Show stale data while refetching
  });

  return {
    ...query,
    dataUpdatedAt: query.dataUpdatedAt,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
