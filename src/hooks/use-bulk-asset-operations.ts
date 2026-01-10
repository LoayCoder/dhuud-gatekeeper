import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Database } from '@/integrations/supabase/types';

type AssetStatus = Database['public']['Enums']['asset_status'];

export interface BulkStatusChangeParams {
  assetIds: string[];
  newStatus: AssetStatus;
}

export interface BulkLocationChangeParams {
  assetIds: string[];
  branchId?: string | null;
  siteId?: string | null;
  buildingId?: string | null;
  floorZoneId?: string | null;
}

export interface BulkDeleteParams {
  assetIds: string[];
}

export function useBulkStatusChange() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({ assetIds, newStatus }: BulkStatusChangeParams) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');
      if (assetIds.length === 0) throw new Error('No assets selected');

      const { error } = await supabase
        .from('hsse_assets')
        .update({
          status: newStatus,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .in('id', assetIds)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);

      if (error) throw error;
      return { count: assetIds.length };
    },
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({ queryKey: ['assets', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['asset-dashboard-stats', profile?.tenant_id] });
      toast.success(t('assets.bulk.statusChangeSuccess', { count }));
    },
    onError: (error) => {
      console.error('Bulk status change error:', error);
      toast.error(t('assets.bulk.statusChangeError'));
    },
  });
}

export function useBulkLocationChange() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({ assetIds, branchId, siteId, buildingId, floorZoneId }: BulkLocationChangeParams) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');
      if (assetIds.length === 0) throw new Error('No assets selected');

      const updatePayload: Record<string, unknown> = {
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      // Only set fields that are provided (allow null to clear)
      if (branchId !== undefined) updatePayload.branch_id = branchId;
      if (siteId !== undefined) updatePayload.site_id = siteId;
      if (buildingId !== undefined) updatePayload.building_id = buildingId;
      if (floorZoneId !== undefined) updatePayload.floor_zone_id = floorZoneId;

      const { error } = await supabase
        .from('hsse_assets')
        .update(updatePayload)
        .in('id', assetIds)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);

      if (error) throw error;
      return { count: assetIds.length };
    },
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({ queryKey: ['assets', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['asset-dashboard-stats', profile?.tenant_id] });
      toast.success(t('assets.bulk.locationChangeSuccess', { count }));
    },
    onError: (error) => {
      console.error('Bulk location change error:', error);
      toast.error(t('assets.bulk.locationChangeError'));
    },
  });
}

export function useBulkDelete() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({ assetIds }: BulkDeleteParams) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');
      if (assetIds.length === 0) throw new Error('No assets selected');

      // Use SECURITY DEFINER function for each asset
      // This handles cascading soft-delete of all related records
      const results = await Promise.all(
        assetIds.map(assetId => 
          supabase.rpc('soft_delete_hsse_asset', { p_asset_id: assetId })
        )
      );

      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Bulk delete errors:', errors);
        throw new Error(`Failed to delete ${errors.length} assets`);
      }

      return { count: assetIds.length };
    },
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({ queryKey: ['assets', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['asset-dashboard-stats', profile?.tenant_id] });
      toast.success(t('assets.bulk.deleteSuccess', { count }));
    },
    onError: (error) => {
      console.error('Bulk delete error:', error);
      toast.error(t('assets.bulk.deleteError'));
    },
  });
}
