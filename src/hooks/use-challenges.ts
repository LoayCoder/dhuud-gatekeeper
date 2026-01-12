import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface Challenge {
  challenge_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  challenge_type: 'weekly' | 'monthly' | 'custom';
  metric_type: 'incidents' | 'observations' | 'total_reports' | 'actions';
  target_count: number;
  start_date: string;
  end_date: string;
  points_reward: number;
  badge_name: string | null;
  badge_name_ar: string | null;
  badge_icon: string | null;
  badge_tier: string | null;
  user_progress: number;
  is_completed: boolean;
  is_joined: boolean;
}

export interface AdminChallenge {
  id: string;
  tenant_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  challenge_type: string;
  metric_type: string;
  target_count: number;
  start_date: string;
  end_date: string;
  badge_id: string | null;
  points_reward: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface CreateChallengeInput {
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  challenge_type: 'weekly' | 'monthly' | 'custom';
  metric_type: 'incidents' | 'observations' | 'total_reports' | 'actions';
  target_count: number;
  start_date: string;
  end_date: string;
  badge_id?: string;
  points_reward: number;
}

export function useActiveChallenges() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-challenges', user?.id],
    queryFn: async (): Promise<Challenge[]> => {
      const { data, error } = await supabase.rpc('get_active_challenges');
      if (error) throw error;
      return (data || []) as unknown as Challenge[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { data, error } = await supabase.rpc('join_challenge', {
        p_challenge_id: challengeId,
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to join challenge');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-challenges'] });
      toast.success(t('challenges.joinSuccess', 'You joined the challenge!'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Admin hooks
export function useAdminChallenges() {
  return useQuery({
    queryKey: ['admin-challenges'],
    queryFn: async (): Promise<AdminChallenge[]> => {
      const { data, error } = await supabase
        .from('safety_challenges')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AdminChallenge[];
    },
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateChallengeInput) => {
      // Get user's tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      const { data, error } = await supabase
        .from('safety_challenges')
        .insert({
          tenant_id: profile.tenant_id,
          title: input.title,
          title_ar: input.title_ar || null,
          description: input.description || null,
          description_ar: input.description_ar || null,
          challenge_type: input.challenge_type,
          metric_type: input.metric_type,
          target_count: input.target_count,
          start_date: input.start_date,
          end_date: input.end_date,
          badge_id: input.badge_id || null,
          points_reward: input.points_reward,
          created_by: user?.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
      toast.success(t('admin.challenges.createSuccess', 'Challenge created successfully'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateChallenge() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, ...input }: CreateChallengeInput & { id: string }) => {
      const { data, error } = await supabase
        .from('safety_challenges')
        .update({
          title: input.title,
          title_ar: input.title_ar || null,
          description: input.description || null,
          description_ar: input.description_ar || null,
          challenge_type: input.challenge_type,
          metric_type: input.metric_type,
          target_count: input.target_count,
          start_date: input.start_date,
          end_date: input.end_date,
          badge_id: input.badge_id || null,
          points_reward: input.points_reward,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
      toast.success(t('admin.challenges.updateSuccess', 'Challenge updated successfully'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('safety_challenges')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
    },
  });
}
