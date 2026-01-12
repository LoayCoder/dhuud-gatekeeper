import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface BadgeDefinition {
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
  unlock_criteria: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface BadgeStatistics {
  badge_id: string;
  badge_key: string;
  name: string;
  name_ar: string | null;
  tier: string;
  category: string;
  points: number;
  total_awarded: number;
  awarded_this_month: number;
  unique_earners: number;
}

export interface CreateBadgeInput {
  badge_key: string;
  name: string;
  name_ar?: string;
  description: string;
  description_ar?: string;
  icon_name: string;
  color_scheme: string;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  unlock_criteria?: Record<string, unknown>;
}

export function useBadgeDefinitions() {
  return useQuery({
    queryKey: ['badge-definitions-admin'],
    queryFn: async (): Promise<BadgeDefinition[]> => {
      const { data, error } = await supabase
        .from('badge_definitions')
        .select('*')
        .order('tier', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as BadgeDefinition[];
    },
  });
}

export function useBadgeStatistics() {
  return useQuery({
    queryKey: ['badge-statistics'],
    queryFn: async (): Promise<BadgeStatistics[]> => {
      const { data, error } = await supabase.rpc('get_badge_statistics');
      if (error) throw error;
      return (data || []) as unknown as BadgeStatistics[];
    },
  });
}

export function useCreateBadge() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: CreateBadgeInput) => {
      const { data, error } = await supabase
        .from('badge_definitions')
        .insert({
          badge_key: input.badge_key,
          name: input.name,
          name_ar: input.name_ar || null,
          description: input.description,
          description_ar: input.description_ar || null,
          icon_name: input.icon_name,
          color_scheme: input.color_scheme,
          category: input.category,
          tier: input.tier,
          points: input.points,
          unlock_criteria: input.unlock_criteria ? JSON.parse(JSON.stringify(input.unlock_criteria)) : {},
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-admin'] });
      toast.success(t('admin.badges.createSuccess', 'Badge created successfully'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateBadge() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, ...input }: CreateBadgeInput & { id: string }) => {
      const { data, error } = await supabase
        .from('badge_definitions')
        .update({
          badge_key: input.badge_key,
          name: input.name,
          name_ar: input.name_ar || null,
          description: input.description,
          description_ar: input.description_ar || null,
          icon_name: input.icon_name,
          color_scheme: input.color_scheme,
          category: input.category,
          tier: input.tier,
          points: input.points,
          unlock_criteria: input.unlock_criteria ? JSON.parse(JSON.stringify(input.unlock_criteria)) : {},
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-admin'] });
      toast.success(t('admin.badges.updateSuccess', 'Badge updated successfully'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useToggleBadgeActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('badge_definitions')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-admin'] });
    },
  });
}
