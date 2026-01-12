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

async function fetchTrackingSettings(): Promise<TrackingIntervalSettings> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return DEFAULT_SETTINGS;

  // Use type assertion to bypass deep type inference
  // platform_settings may not have tenant_id/deleted_at columns
  const client = supabase as any;
  const { data } = await client
    .from('platform_settings')
    .select('value')
    .eq('setting_key', 'guard_tracking_interval_minutes')
    .limit(1);

  const row = data?.[0];
  if (row?.value) {
    try {
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  return DEFAULT_SETTINGS;
}

/**
 * Hook to fetch the guard tracking interval setting
 */
export function useTrackingInterval() {
  return useQuery({
    queryKey: ['tracking-interval-settings'],
    queryFn: fetchTrackingSettings,
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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Not authenticated');

      if (minutes < 1 || minutes > 30) {
        throw new Error('Interval must be between 1 and 30 minutes');
      }

      const client = supabase as any;
      
      const settingValue = JSON.stringify({
        default: 5,
        min: 1,
        max: 30,
        current: minutes,
      });

      // Update the existing record (created by migration)
      const { error } = await client
        .from('platform_settings')
        .update({ value: settingValue })
        .eq('setting_key', 'guard_tracking_interval_minutes');
      
      if (error) throw error;

      return minutes;
    },
    onMutate: async (minutes) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tracking-interval-settings'] });
      
      // Snapshot previous value
      const previousSettings = queryClient.getQueryData(['tracking-interval-settings']);
      
      // Optimistically update
      queryClient.setQueryData(['tracking-interval-settings'], (old: TrackingIntervalSettings | undefined) => ({
        ...DEFAULT_SETTINGS,
        ...old,
        current: minutes,
      }));
      
      return { previousSettings };
    },
    onSuccess: (minutes) => {
      toast({ title: 'Settings Updated', description: `Tracking interval set to ${minutes} minutes` });
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(['tracking-interval-settings'], context.previousSettings);
      }
      
      // Check if it's a permissions error
      if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
        toast({ 
          title: 'Permission Denied', 
          description: 'You do not have permission to change tracking settings. Please contact an administrator.', 
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
      }
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['tracking-interval-settings'] });
      queryClient.invalidateQueries({ queryKey: ['guard-locations'] });
      queryClient.invalidateQueries({ queryKey: ['geofence-alerts'] });
    },
  });
}