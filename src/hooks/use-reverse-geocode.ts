import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';

export interface LocationAddress {
  country: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
  formatted_address: string | null;
}

export function useReverseGeocode() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<LocationAddress | null>(null);
  const { i18n, t } = useTranslation();

  const fetchAddress = useCallback(async (
    latitude: number,
    longitude: number
  ): Promise<LocationAddress | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('reverse-geocode', {
        body: {
          latitude,
          longitude,
          language: i18n.language === 'ar' ? 'ar' : 'en',
        },
      });

      if (invokeError) {
        console.error('Reverse geocode error:', invokeError);
        setError(invokeError.message);
        toast({
          title: t('common.error', 'Error'),
          description: t('incidents.addressFetchFailed', 'Could not fetch address details. Location coordinates will still be saved.'),
          variant: 'destructive',
        });
        return null;
      }

      if (data?.error) {
        console.error('Reverse geocode API error:', data.error);
        setError(data.error);
        toast({
          title: t('common.error', 'Error'),
          description: t('incidents.addressFetchFailed', 'Could not fetch address details. Location coordinates will still be saved.'),
          variant: 'destructive',
        });
        return null;
      }

      const locationAddress: LocationAddress = {
        country: data.country || null,
        city: data.city || null,
        district: data.district || null,
        street: data.street || null,
        formatted_address: data.formatted_address || null,
      };

      setAddress(locationAddress);
      return locationAddress;
    } catch (err) {
      console.error('Reverse geocode exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch address';
      setError(errorMessage);
      toast({
        title: t('common.error', 'Error'),
        description: t('incidents.addressFetchFailed', 'Could not fetch address details. Location coordinates will still be saved.'),
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [i18n.language, t]);

  const reset = useCallback(() => {
    setAddress(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    fetchAddress,
    address,
    isLoading,
    error,
    reset,
  };
}
