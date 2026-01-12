import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Badge {
  id: string;
  badge_key: string;
  name: string;
  name_ar: string | null;
  description: string;
  description_ar: string | null;
  icon_name: string;
  color_scheme: string;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
}

export interface EarnedBadge extends Badge {
  earned_at: string;
  is_new: boolean;
}

export interface AvailableBadge extends Badge {
  progress: number;
  current: number;
  threshold: number;
}

export interface NextBadge {
  id: string;
  badge_key: string;
  name: string;
  name_ar: string | null;
  icon_name: string;
  color_scheme: string;
  tier: string;
  progress: number;
  remaining: number;
}

export interface BadgesData {
  earned_badges: EarnedBadge[];
  available_badges: AvailableBadge[];
  total_points: number;
  next_badge: NextBadge | null;
  stats: {
    total_incidents: number;
    total_observations: number;
    total_reports: number;
    completed_actions: number;
    this_month_reports: number;
    streak_weeks: number;
  };
}

export function useMyBadges() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-badges', user?.id],
    queryFn: async (): Promise<BadgesData> => {
      const { data, error } = await supabase.rpc('get_my_badges_and_progress');
      
      if (error) throw error;
      
      const result = data as unknown as BadgesData;
      
      return {
        earned_badges: result.earned_badges || [],
        available_badges: result.available_badges || [],
        total_points: result.total_points || 0,
        next_badge: result.next_badge || null,
        stats: result.stats || {
          total_incidents: 0,
          total_observations: 0,
          total_reports: 0,
          completed_actions: 0,
          this_month_reports: 0,
          streak_weeks: 0,
        },
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCheckBadges() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('check_and_award_badges');
      if (error) throw error;
      return data as unknown as { awarded: number; new_badges: Badge[] };
    },
    onSuccess: (data) => {
      if (data.awarded > 0) {
        queryClient.invalidateQueries({ queryKey: ['my-badges'] });
      }
    },
  });
}

export function useMarkBadgesNotified() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (badgeIds: string[]) => {
      const { error } = await supabase.rpc('mark_badges_notified', {
        p_badge_ids: badgeIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-badges'] });
    },
  });
}
