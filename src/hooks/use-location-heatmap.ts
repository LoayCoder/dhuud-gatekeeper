import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SeverityLevelV2 } from "@/lib/hsse-severity-levels";

export interface BranchHeatmapData {
  branch_id: string;
  branch_name: string;
  total_events: number;
  level_5_count: number; // Catastrophic
  level_4_count: number; // Major
  level_3_count: number; // Serious
  level_2_count: number; // Moderate
  level_1_count: number; // Low
  density_score: number; // 0-100 normalized
}

export interface SiteBubbleData {
  site_id: string;
  site_name: string;
  branch_id: string;
  branch_name: string;
  total_events: number;
  severity_score: number; // weighted severity
  incidents: number;
  observations: number;
}

export interface TemporalHeatmapCell {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  count: number;
  density: number; // 0-100 normalized
}

export interface LocationHeatmapData {
  branches: BranchHeatmapData[];
  sites: SiteBubbleData[];
  temporal: TemporalHeatmapCell[];
  maxBranchEvents: number;
  maxSiteEvents: number;
  maxTemporalCount: number;
}

// Severity weighting for 5-level system
const SEVERITY_WEIGHTS: Record<SeverityLevelV2, number> = {
  'level_5': 5,
  'level_4': 4,
  'level_3': 3,
  'level_2': 2,
  'level_1': 1,
};

export function useLocationHeatmap(startDate?: Date, endDate?: Date) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['location-heatmap', profile?.tenant_id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<LocationHeatmapData> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('incidents')
        .select('id, branch_id, site_id, severity_v2, event_type, occurred_at, branches!inner(id, name), sites(id, name)')
        .is('deleted_at', null);

      if (startDate) {
        query = query.gte('occurred_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('occurred_at', endDate.toISOString());
      }

      const { data: incidents, error } = await query;
      if (error) throw error;

      // Aggregate by branch
      const branchMap = new Map<string, BranchHeatmapData>();
      const siteMap = new Map<string, SiteBubbleData>();
      const temporalMap = new Map<string, number>(); // "day-hour" -> count

      (incidents || []).forEach((inc: any) => {
        const branchId = inc.branch_id;
        const branchName = inc.branches?.name || 'Unknown';
        const siteId = inc.site_id;
        const siteName = inc.sites?.name;
        const severityV2 = (inc.severity_v2 || 'level_1') as SeverityLevelV2;
        const eventType = inc.event_type;
        const occurredAt = inc.occurred_at ? new Date(inc.occurred_at) : null;

        // Branch aggregation
        if (branchId) {
          const existing = branchMap.get(branchId) || {
            branch_id: branchId,
            branch_name: branchName,
            total_events: 0,
            level_5_count: 0,
            level_4_count: 0,
            level_3_count: 0,
            level_2_count: 0,
            level_1_count: 0,
            density_score: 0,
          };
          existing.total_events++;
          if (severityV2 === 'level_5') existing.level_5_count++;
          else if (severityV2 === 'level_4') existing.level_4_count++;
          else if (severityV2 === 'level_3') existing.level_3_count++;
          else if (severityV2 === 'level_2') existing.level_2_count++;
          else existing.level_1_count++;
          branchMap.set(branchId, existing);
        }

        // Site aggregation
        if (siteId && siteName) {
          const existing = siteMap.get(siteId) || {
            site_id: siteId,
            site_name: siteName,
            branch_id: branchId || '',
            branch_name: branchName,
            total_events: 0,
            severity_score: 0,
            incidents: 0,
            observations: 0,
          };
          existing.total_events++;
          // Weighted severity score using 5-level system
          const severityWeight = SEVERITY_WEIGHTS[severityV2] || 1;
          existing.severity_score += severityWeight;
          if (eventType === 'observation') existing.observations++;
          else existing.incidents++;
          siteMap.set(siteId, existing);
        }

        // Temporal aggregation
        if (occurredAt) {
          const day = occurredAt.getDay();
          const hour = occurredAt.getHours();
          const key = `${day}-${hour}`;
          temporalMap.set(key, (temporalMap.get(key) || 0) + 1);
        }
      });

      // Calculate max values for normalization
      const branches = Array.from(branchMap.values());
      const sites = Array.from(siteMap.values());
      const maxBranchEvents = Math.max(...branches.map(b => b.total_events), 1);
      const maxSiteEvents = Math.max(...sites.map(s => s.total_events), 1);

      // Normalize branch density scores
      branches.forEach(b => {
        b.density_score = Math.round((b.total_events / maxBranchEvents) * 100);
      });

      // Build temporal grid (7 days × 24 hours)
      const temporal: TemporalHeatmapCell[] = [];
      let maxTemporalCount = 1;
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const count = temporalMap.get(`${day}-${hour}`) || 0;
          if (count > maxTemporalCount) maxTemporalCount = count;
          temporal.push({ day, hour, count, density: 0 });
        }
      }
      // Normalize temporal density
      temporal.forEach(t => {
        t.density = Math.round((t.count / maxTemporalCount) * 100);
      });

      return {
        branches: branches.sort((a, b) => b.total_events - a.total_events),
        sites: sites.sort((a, b) => b.total_events - a.total_events),
        temporal,
        maxBranchEvents,
        maxSiteEvents,
        maxTemporalCount,
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
}
