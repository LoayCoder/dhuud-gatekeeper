import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface DeptRepDigestPreferences {
  dept_digest_opt_in: boolean;
  dept_digest_frequency: 'daily' | 'weekly';
  digest_preferred_time: string;
  digest_timezone: string;
}

const TIMEZONE_OPTIONS = [
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Kuwait',
  'Asia/Bahrain',
  'Asia/Qatar',
  'Asia/Muscat',
  'UTC',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', labelEn: 'Daily', labelAr: 'يومي' },
  { value: 'weekly', labelEn: 'Weekly (Sundays)', labelAr: 'أسبوعي (الأحد)' },
] as const;

export function useDeptRepDigestPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['dept-rep-digest-preferences', user?.id],
    queryFn: async (): Promise<DeptRepDigestPreferences | null> => {
      if (!user?.id) return null;

      // Use type assertion to handle new columns that may not be in generated types yet
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      // Extract the fields we need, with defaults for new columns
      const profile = data as Record<string, unknown>;
      return {
        dept_digest_opt_in: (profile.dept_digest_opt_in as boolean) ?? false,
        dept_digest_frequency: (profile.dept_digest_frequency as 'daily' | 'weekly') ?? 'daily',
        digest_preferred_time: (profile.digest_preferred_time as string) ?? '08:00',
        digest_timezone: (profile.digest_timezone as string) ?? 'Asia/Riyadh',
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const updatePreferences = useMutation({
    mutationFn: async (newPrefs: Partial<DeptRepDigestPreferences>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Use type assertion for update with new columns
      const { error } = await supabase
        .from('profiles')
        .update(newPrefs as Record<string, unknown>)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dept-rep-digest-preferences', user?.id] });
      toast({
        title: 'Preferences updated',
        description: 'Your gate pass digest preferences have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences,
    timezoneOptions: TIMEZONE_OPTIONS,
    frequencyOptions: FREQUENCY_OPTIONS,
  };
}
