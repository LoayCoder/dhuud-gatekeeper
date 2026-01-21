import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
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
  site?: { id: string; name: string; latitude: number | null; longitude: number | null } | null;
  category?: { id: string; name: string; name_ar: string | null } | null;
  // Computed fields for location fallback
  effective_lat: number | null;
  effective_lng: number | null;
  location_source: 'asset' | 'site' | null;
  // Overdue status fields
  next_inspection_due: string | null;
  isInspectionOverdue: boolean;
  isMaintenanceOverdue: boolean;
  daysInspectionOverdue: number | null;
  daysMaintenanceOverdue: number | null;
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

      // Fetch assets with site and category
      let query = supabase
        .from('hsse_assets')
        .select(`
          id, asset_code, name, status,
          gps_lat, gps_lng, gps_accuracy, gps_validated_at, location_verified,
          next_inspection_due,
          site:sites!hsse_assets_site_id_fkey(id, name, latitude, longitude),
          category:asset_categories!hsse_assets_category_id_fkey(id, name, name_ar)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (filters.siteId) {
        query = query.eq('site_id', filters.siteId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status as Database['public']['Tables']['hsse_assets']['Row']['status']);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      // Fetch overdue maintenance schedules
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const { data: overdueMaintenanceData } = await supabase
        .from('asset_maintenance_schedules')
        .select('asset_id, next_due')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .lt('next_due', todayStr);

      // Create a map of asset IDs to their overdue maintenance days
      const overdueMaintenanceMap = new Map<string, number>();
      overdueMaintenanceData?.forEach(m => {
        if (m.next_due) {
          const daysOverdue = Math.floor((today.getTime() - new Date(m.next_due).getTime()) / (1000 * 60 * 60 * 24));
          const existing = overdueMaintenanceMap.get(m.asset_id);
          // Keep the highest overdue days if multiple schedules
          if (!existing || daysOverdue > existing) {
            overdueMaintenanceMap.set(m.asset_id, daysOverdue);
          }
        }
      });

      // Compute effective coordinates with site fallback and overdue status
      const assetsWithEffectiveLocation = (data || []).map(asset => {
        const hasOwnGPS = asset.gps_lat !== null && asset.gps_lng !== null;
        const hasSiteGPS = asset.site?.latitude !== null && asset.site?.longitude !== null;
        
        const isInspectionOverdue = asset.next_inspection_due 
          ? asset.next_inspection_due < todayStr 
          : false;
        const daysInspectionOverdue = asset.next_inspection_due && asset.next_inspection_due < todayStr
          ? Math.floor((today.getTime() - new Date(asset.next_inspection_due).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        const maintenanceDaysOverdue = overdueMaintenanceMap.get(asset.id);
        
        return {
          ...asset,
          effective_lat: hasOwnGPS ? asset.gps_lat : (hasSiteGPS ? asset.site!.latitude : null),
          effective_lng: hasOwnGPS ? asset.gps_lng : (hasSiteGPS ? asset.site!.longitude : null),
          location_source: hasOwnGPS ? 'asset' as const : (hasSiteGPS ? 'site' as const : null),
          isInspectionOverdue,
          daysInspectionOverdue,
          isMaintenanceOverdue: maintenanceDaysOverdue !== undefined,
          daysMaintenanceOverdue: maintenanceDaysOverdue ?? null,
        };
      });
      
      // Only return assets that have SOME location (either own or site)
      return assetsWithEffectiveLocation.filter(
        a => a.effective_lat !== null && a.effective_lng !== null
      ) as AssetWithGPS[];
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
