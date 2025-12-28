import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subDays } from 'date-fns';

export interface GuardPerformanceMetrics {
  id: string;
  tenant_id: string;
  guard_id: string;
  metric_date: string;
  patrols_completed: number;
  patrols_assigned: number;
  checkpoints_verified: number;
  checkpoints_missed: number;
  avg_checkpoint_time_seconds: number | null;
  incidents_reported: number;
  incidents_resolved: number;
  geofence_violations: number;
  shift_punctuality_minutes: number;
  emergency_response_time_seconds: number | null;
  handovers_completed: number;
  overall_score: number | null;
  guard?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface GuardPerformanceSummary {
  guard_id: string;
  guard_name: string;
  avatar_url: string | null;
  patrol_completion_rate: number;
  checkpoint_accuracy: number;
  punctuality_score: number;
  incident_response_rate: number;
  geofence_compliance: number;
  overall_score: number;
  trend: 'up' | 'down' | 'stable';
}

export function useGuardPerformanceMetrics(guardId?: string, dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: ['guard-performance', guardId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('guard_performance_metrics')
        .select(`
          id,
          tenant_id,
          guard_id,
          metric_date,
          patrols_completed,
          patrols_assigned,
          checkpoints_verified,
          checkpoints_missed,
          avg_checkpoint_time_seconds,
          incidents_reported,
          incidents_resolved,
          geofence_violations,
          shift_punctuality_minutes,
          emergency_response_time_seconds,
          handovers_completed,
          overall_score,
          guard:profiles!guard_performance_metrics_guard_id_fkey(full_name, avatar_url)
        `)
        .is('deleted_at', null)
        .order('metric_date', { ascending: false });

      if (guardId) {
        query = query.eq('guard_id', guardId);
      }

      if (dateRange) {
        query = query.gte('metric_date', dateRange.start).lte('metric_date', dateRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GuardPerformanceMetrics[];
    },
  });
}

export function useGuardPerformanceSummary(period: 'week' | 'month' | 'all' = 'month') {
  return useQuery({
    queryKey: ['guard-performance-summary', period],
    queryFn: async () => {
      // Calculate date range based on period
      const now = new Date();
      let startDate: string;
      let endDate: string = format(now, 'yyyy-MM-dd');

      if (period === 'week') {
        startDate = format(startOfWeek(now), 'yyyy-MM-dd');
        endDate = format(endOfWeek(now), 'yyyy-MM-dd');
      } else if (period === 'month') {
        startDate = format(startOfMonth(now), 'yyyy-MM-dd');
        endDate = format(endOfMonth(now), 'yyyy-MM-dd');
      } else {
        startDate = format(subDays(now, 365), 'yyyy-MM-dd');
      }

      // Fetch performance metrics
      const { data: metrics, error } = await supabase
        .from('guard_performance_metrics')
        .select(`
          guard_id,
          patrols_completed,
          patrols_assigned,
          checkpoints_verified,
          checkpoints_missed,
          geofence_violations,
          shift_punctuality_minutes,
          incidents_reported,
          incidents_resolved,
          overall_score,
          guard:profiles!guard_performance_metrics_guard_id_fkey(full_name, avatar_url)
        `)
        .is('deleted_at', null)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate);

      if (error) throw error;

      // Aggregate metrics by guard
      const guardMap = new Map<string, {
        guard_id: string;
        guard_name: string;
        avatar_url: string | null;
        totalPatrolsCompleted: number;
        totalPatrolsAssigned: number;
        totalCheckpointsVerified: number;
        totalCheckpointsMissed: number;
        totalGeofenceViolations: number;
        totalPunctualityMinutes: number;
        totalIncidentsReported: number;
        totalIncidentsResolved: number;
        scores: number[];
        count: number;
      }>();

      for (const m of metrics || []) {
        const existing = guardMap.get(m.guard_id) || {
          guard_id: m.guard_id,
          guard_name: (m.guard as any)?.full_name || 'Unknown',
          avatar_url: (m.guard as any)?.avatar_url || null,
          totalPatrolsCompleted: 0,
          totalPatrolsAssigned: 0,
          totalCheckpointsVerified: 0,
          totalCheckpointsMissed: 0,
          totalGeofenceViolations: 0,
          totalPunctualityMinutes: 0,
          totalIncidentsReported: 0,
          totalIncidentsResolved: 0,
          scores: [],
          count: 0,
        };

        existing.totalPatrolsCompleted += m.patrols_completed || 0;
        existing.totalPatrolsAssigned += m.patrols_assigned || 0;
        existing.totalCheckpointsVerified += m.checkpoints_verified || 0;
        existing.totalCheckpointsMissed += m.checkpoints_missed || 0;
        existing.totalGeofenceViolations += m.geofence_violations || 0;
        existing.totalPunctualityMinutes += m.shift_punctuality_minutes || 0;
        existing.totalIncidentsReported += m.incidents_reported || 0;
        existing.totalIncidentsResolved += m.incidents_resolved || 0;
        if (m.overall_score) existing.scores.push(Number(m.overall_score));
        existing.count++;

        guardMap.set(m.guard_id, existing);
      }

      // Calculate summary for each guard
      const summaries: GuardPerformanceSummary[] = [];

      for (const guard of guardMap.values()) {
        const patrolCompletionRate = guard.totalPatrolsAssigned > 0
          ? (guard.totalPatrolsCompleted / guard.totalPatrolsAssigned) * 100
          : 100;

        const totalCheckpoints = guard.totalCheckpointsVerified + guard.totalCheckpointsMissed;
        const checkpointAccuracy = totalCheckpoints > 0
          ? (guard.totalCheckpointsVerified / totalCheckpoints) * 100
          : 100;

        // Punctuality: positive minutes = late, negative = early
        const avgPunctuality = guard.count > 0 ? guard.totalPunctualityMinutes / guard.count : 0;
        const punctualityScore = Math.max(0, 100 - Math.abs(avgPunctuality) * 5);

        const incidentResponseRate = guard.totalIncidentsReported > 0
          ? (guard.totalIncidentsResolved / guard.totalIncidentsReported) * 100
          : 100;

        // Geofence compliance (fewer violations = better)
        const geofenceCompliance = Math.max(0, 100 - guard.totalGeofenceViolations * 10);

        const avgScore = guard.scores.length > 0
          ? guard.scores.reduce((a, b) => a + b, 0) / guard.scores.length
          : (patrolCompletionRate + checkpointAccuracy + punctualityScore + incidentResponseRate + geofenceCompliance) / 5;

        summaries.push({
          guard_id: guard.guard_id,
          guard_name: guard.guard_name,
          avatar_url: guard.avatar_url,
          patrol_completion_rate: Math.round(patrolCompletionRate),
          checkpoint_accuracy: Math.round(checkpointAccuracy),
          punctuality_score: Math.round(punctualityScore),
          incident_response_rate: Math.round(incidentResponseRate),
          geofence_compliance: Math.round(geofenceCompliance),
          overall_score: Math.round(avgScore),
          trend: 'stable', // Would need historical comparison for actual trend
        });
      }

      // Sort by overall score descending
      summaries.sort((a, b) => b.overall_score - a.overall_score);

      return summaries;
    },
  });
}

export function useGuardLeaderboard() {
  return useQuery({
    queryKey: ['guard-leaderboard'],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('guard_performance_metrics')
        .select(`
          guard_id,
          overall_score,
          guard:profiles!guard_performance_metrics_guard_id_fkey(full_name, avatar_url)
        `)
        .is('deleted_at', null)
        .gte('metric_date', thirtyDaysAgo)
        .order('overall_score', { ascending: false });

      if (error) throw error;

      // Aggregate and get top performers
      const guardScores = new Map<string, { name: string; avatar: string | null; scores: number[] }>();
      
      for (const m of data || []) {
        const key = m.guard_id;
        const existing = guardScores.get(key) || {
          name: (m.guard as any)?.full_name || 'Unknown',
          avatar: (m.guard as any)?.avatar_url || null,
          scores: [],
        };
        if (m.overall_score) existing.scores.push(Number(m.overall_score));
        guardScores.set(key, existing);
      }

      const leaderboard = Array.from(guardScores.entries())
        .map(([id, data]) => ({
          guard_id: id,
          guard_name: data.name,
          avatar_url: data.avatar,
          average_score: data.scores.length > 0
            ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
            : 0,
        }))
        .sort((a, b) => b.average_score - a.average_score)
        .slice(0, 10);

      return leaderboard;
    },
  });
}

export function useSecurityTeamStats() {
  return useQuery({
    queryKey: ['security-team-stats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      // Get today's stats
      const { data: todayData } = await supabase
        .from('guard_performance_metrics')
        .select('patrols_completed, checkpoints_verified, incidents_reported, geofence_violations')
        .eq('metric_date', today)
        .is('deleted_at', null);

      // Get week stats
      const { data: weekData } = await supabase
        .from('guard_performance_metrics')
        .select('patrols_completed, checkpoints_verified, incidents_reported, geofence_violations')
        .gte('metric_date', weekAgo)
        .is('deleted_at', null);

      const sumMetrics = (data: any[] | null) => ({
        patrols: data?.reduce((sum, m) => sum + (m.patrols_completed || 0), 0) || 0,
        checkpoints: data?.reduce((sum, m) => sum + (m.checkpoints_verified || 0), 0) || 0,
        incidents: data?.reduce((sum, m) => sum + (m.incidents_reported || 0), 0) || 0,
        violations: data?.reduce((sum, m) => sum + (m.geofence_violations || 0), 0) || 0,
      });

      return {
        today: sumMetrics(todayData),
        week: sumMetrics(weekData),
      };
    },
  });
}
