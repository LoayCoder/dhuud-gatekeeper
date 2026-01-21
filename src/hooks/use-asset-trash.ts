import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface TrashAsset {
  id: string;
  asset_code: string;
  name: string;
  deleted_at: string;
  expires_at: string;
  days_remaining: number;
  category_name: string | null;
  category_name_ar: string | null;
  category_icon: string | null;
}

/**
 * Hook to fetch assets in trash with expiry info
 */
export function useTrashAssets() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['assets-trash', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trash_assets');

      if (error) throw error;
      return data as TrashAsset[];
    },
    enabled: !!profile?.tenant_id,
  });
}

/**
 * Hook to get trash count for badges
 */
export function useTrashCount() {
  const { data: trashAssets } = useTrashAssets();
  return trashAssets?.length ?? 0;
}

/**
 * Hook to soft-delete an asset (move to trash)
 */
export function useMoveToTrash() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const { data, error } = await supabase
        .rpc('soft_delete_hsse_asset', { p_asset_id: assetId });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['assets-trash', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['asset-dashboard-stats', profile?.tenant_id] });
      toast.success(t('assets.trash.moveSuccess'));
    },
    onError: (error) => {
      console.error('Move to trash error:', error);
      toast.error(t('assets.trash.moveError'));
    },
  });
}

/**
 * Hook to restore an asset from trash
 */
export function useRestoreAsset() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const { data, error } = await supabase
        .rpc('restore_hsse_asset', { p_asset_id: assetId });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['assets-trash', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['asset-dashboard-stats', profile?.tenant_id] });
      toast.success(t('assets.trash.restoreSuccess'));
    },
    onError: (error: Error) => {
      console.error('Restore asset error:', error);
      toast.error(error.message || t('assets.trash.restoreError'));
    },
  });
}

/**
 * Hook to permanently delete an asset immediately
 */
export function usePermanentDelete() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase
        .rpc('hard_delete_hsse_asset', { p_asset_id: assetId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets-trash', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['asset-dashboard-stats', profile?.tenant_id] });
      toast.success(t('assets.trash.permanentDeleteSuccess'));
    },
    onError: (error) => {
      console.error('Permanent delete error:', error);
      toast.error(t('assets.trash.permanentDeleteError'));
    },
  });
}

/**
 * Hook to bulk soft-delete assets
 */
export function useBulkMoveToTrash() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (assetIds: string[]) => {
      if (assetIds.length === 0) throw new Error('No assets selected');

      const { data, error } = await supabase
        .rpc('bulk_soft_delete_assets', { p_asset_ids: assetIds });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['assets', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['assets-trash', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['asset-dashboard-stats', profile?.tenant_id] });
      toast.success(t('assets.trash.bulkMoveSuccess', { count }));
    },
    onError: (error) => {
      console.error('Bulk move to trash error:', error);
      toast.error(t('assets.trash.bulkMoveError'));
    },
  });
}

/**
 * Hook to bulk restore assets from trash
 */
export function useBulkRestore() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (assetIds: string[]) => {
      if (assetIds.length === 0) throw new Error('No assets selected');

      const { data, error } = await supabase
        .rpc('bulk_restore_assets', { p_asset_ids: assetIds });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['assets', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['assets-trash', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['asset-dashboard-stats', profile?.tenant_id] });
      toast.success(t('assets.trash.bulkRestoreSuccess', { count }));
    },
    onError: (error) => {
      console.error('Bulk restore error:', error);
      toast.error(t('assets.trash.bulkRestoreError'));
    },
  });
}

/**
 * Hook to empty entire trash (permanent delete all)
 */
export function useEmptyTrash() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { data: trashAssets } = useTrashAssets();

  return useMutation({
    mutationFn: async () => {
      if (!trashAssets || trashAssets.length === 0) {
        throw new Error('Trash is empty');
      }

      // Permanently delete all items in trash
      const results = await Promise.all(
        trashAssets.map(asset => 
          supabase.rpc('hard_delete_hsse_asset', { p_asset_id: asset.id })
        )
      );

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Some deletions failed:', errors);
        throw new Error(`Failed to delete ${errors.length} items`);
      }

      return trashAssets.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['assets-trash', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['asset-dashboard-stats', profile?.tenant_id] });
      toast.success(t('assets.trash.emptySuccess', { count }));
    },
    onError: (error) => {
      console.error('Empty trash error:', error);
      toast.error(t('assets.trash.emptyError'));
    },
  });
}
