import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface DigestPreferences {
  digest_opt_in: boolean;
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

export function useDigestPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['digest-preferences', user?.id],
    queryFn: async (): Promise<DigestPreferences | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('digest_opt_in, digest_preferred_time, digest_timezone')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as DigestPreferences;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const updatePreferences = useMutation({
    mutationFn: async (newPrefs: Partial<DigestPreferences>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(newPrefs)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digest-preferences', user?.id] });
      toast({
        title: 'Preferences updated',
        description: 'Your digest preferences have been saved.',
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
  };
}
