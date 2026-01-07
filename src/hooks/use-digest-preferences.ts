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
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['digest-preferences', profile?.id],
    queryFn: async (): Promise<DigestPreferences | null> => {
      if (!profile?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('digest_opt_in, digest_preferred_time, digest_timezone')
        .eq('id', profile.id)
        .single();

      if (error) throw error;
      return data as DigestPreferences;
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  });

  const updatePreferences = useMutation({
    mutationFn: async (newPrefs: Partial<DigestPreferences>) => {
      if (!profile?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(newPrefs)
        .eq('id', profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digest-preferences', profile?.id] });
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
