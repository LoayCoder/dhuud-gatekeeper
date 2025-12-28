import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface AssetWithGPS {
  id: string;
  asset_code: string;
  name: string;
  status: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  gps_validated_at: string | null;
  location_verified: boolean | null;
  site?: { id: string; name: string } | null;
  category?: { id: string; name: string; name_ar: string | null } | null;
}

interface UseAssetsWithGPSFilters {
  siteId?: string;
  status?: string;
}

export function useAssetsWithGPS(filters: UseAssetsWithGPSFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['assets-with-gps', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('hsse_assets')
        .select(`
          id, asset_code, name, status,
          gps_lat, gps_lng, gps_accuracy, gps_validated_at, location_verified,
          site:sites!hsse_assets_site_id_fkey(id, name),
          category:asset_categories!hsse_assets_category_id_fkey(id, name, name_ar)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .not('gps_lat', 'is', null)
        .not('gps_lng', 'is', null);

      if (filters.siteId) {
        query = query.eq('site_id', filters.siteId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      return data as AssetWithGPS[];
    },
    enabled: !!tenantId,
  });
}

export function useUpdateAssetLocation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      assetId,
      lat,
      lng,
      accuracy,
    }: {
      assetId: string;
      lat: number;
      lng: number;
      accuracy: number;
    }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');

      const { error } = await supabase
        .from('hsse_assets')
        .update({
          gps_lat: lat,
          gps_lng: lng,
          gps_accuracy: accuracy,
          gps_validated_at: new Date().toISOString(),
          location_verified: true,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assetId)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['asset', variables.assetId] });
      queryClient.invalidateQueries({ queryKey: ['assets-with-gps'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (error) => {
      console.error('Update location error:', error);
      toast.error(t('assets.gps.updateFailed'));
    },
  });
}

export function useClearAssetLocation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (assetId: string) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');

      const { error } = await supabase
        .from('hsse_assets')
        .update({
          gps_lat: null,
          gps_lng: null,
          gps_accuracy: null,
          gps_validated_at: null,
          location_verified: false,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assetId)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
    },
    onSuccess: (_, assetId) => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      queryClient.invalidateQueries({ queryKey: ['assets-with-gps'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(t('assets.gps.locationCleared'));
    },
    onError: (error) => {
      console.error('Clear location error:', error);
      toast.error(t('assets.gps.clearFailed'));
    },
  });
}
