import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrackingIntervalSettings {
  default: number;
  min: number;
  max: number;
  current?: number;
}

const DEFAULT_SETTINGS: TrackingIntervalSettings = {
  default: 5,
  min: 1,
  max: 30,
};

/**
 * Hook to fetch the guard tracking interval setting from platform_settings
 */
export function useTrackingInterval() {
  return useQuery({
    queryKey: ['tracking-interval-settings'],
    queryFn: async (): Promise<TrackingIntervalSettings> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return DEFAULT_SETTINGS;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) return DEFAULT_SETTINGS;

      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('setting_key', 'guard_tracking_interval_minutes')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (data?.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          return { ...DEFAULT_SETTINGS, ...parsed };
        } catch {
          return DEFAULT_SETTINGS;
        }
      }

      return DEFAULT_SETTINGS;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get the tracking interval in milliseconds
 */
export function useTrackingIntervalMs() {
  const { data: settings } = useTrackingInterval();
  const minutes = settings?.current ?? settings?.default ?? DEFAULT_SETTINGS.default;
  return minutes * 60 * 1000;
}

/**
 * Hook to update the tracking interval setting
 */
export function useUpdateTrackingInterval() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (minutes: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      if (minutes < 1 || minutes > 30) {
        throw new Error('Interval must be between 1 and 30 minutes');
      }

      const { data: existing } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('setting_key', 'guard_tracking_interval_minutes')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .maybeSingle();

      const settingValue = JSON.stringify({
        default: 5,
        min: 1,
        max: 30,
        current: minutes,
      });

      if (existing) {
        const { error } = await supabase
          .from('platform_settings')
          .update({ value: settingValue })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert({
            setting_key: 'guard_tracking_interval_minutes',
            value: settingValue,
            tenant_id: profile.tenant_id,
          });
        if (error) throw error;
      }

      return minutes;
    },
    onSuccess: (minutes) => {
      queryClient.invalidateQueries({ queryKey: ['tracking-interval-settings'] });
      toast({ title: 'Settings Updated', description: `Tracking interval set to ${minutes} minutes` });
    },
    onError: (error) => {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    },
  });
}