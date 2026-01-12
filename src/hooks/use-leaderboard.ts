import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type LeaderboardPeriod = 'week' | 'month' | 'year' | 'all_time';
export type LeaderboardCategory = 'overall' | 'incidents' | 'observations' | 'actions' | 'badges';

export interface LeaderboardEntry {
  anonymous_id: string;
  rank_position: number;
  total_reports: number;
  incidents_count: number;
  observations_count: number;
  completed_actions: number;
  total_points: number;
  badge_count: number;
  is_current_user: boolean;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  myEntry: LeaderboardEntry | null;
  totalParticipants: number;
  myPercentile: number | null;
}

export function useAnonymousLeaderboard(
  period: LeaderboardPeriod = 'all_time',
  category: LeaderboardCategory = 'overall'
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leaderboard', period, category, user?.id],
    queryFn: async (): Promise<LeaderboardData> => {
      const { data, error } = await supabase.rpc('get_anonymous_leaderboard', {
        p_period: period,
        p_category: category,
      });

      if (error) throw error;

      const entries = (data || []) as unknown as LeaderboardEntry[];
      const myEntry = entries.find((e) => e.is_current_user) || null;
      const totalParticipants = entries.length;
      
      let myPercentile: number | null = null;
      if (myEntry && totalParticipants > 0) {
        myPercentile = Math.round(((totalParticipants - myEntry.rank_position + 1) / totalParticipants) * 100);
      }

      return {
        entries,
        myEntry,
        totalParticipants,
        myPercentile,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
