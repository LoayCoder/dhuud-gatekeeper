import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import type { Database } from '@/integrations/supabase/types';

type AssetInsert = Database['public']['Tables']['hsse_assets']['Insert'];
type AssetUpdate = Database['public']['Tables']['hsse_assets']['Update'];
type AssetStatus = Database['public']['Enums']['asset_status'];
type AssetCondition = Database['public']['Enums']['asset_condition'];

export interface AssetFilters {
  search?: string;
  status?: AssetStatus | null;
  condition?: AssetCondition | null;
  categoryId?: string | null;
  branchId?: string | null;
  siteId?: string | null;
}

const PAGE_SIZE = 20;

export function useAssets(filters: AssetFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['assets', tenantId, filters, page],
    queryFn: async () => {
      if (!tenantId) return { data: [], count: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false };
      const { getAssets } = await import('@/features/assets/services/assetQueryService');
      return getAssets(tenantId, page, filters);
    },
    enabled: !!tenantId,
  });

  const goToPage = useCallback((newPage: number) => setPage(newPage), []);
  const goToNextPage = useCallback(() => setPage(p => p + 1), []);
  const goToPreviousPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const goToFirstPage = useCallback(() => setPage(1), []);

  return {
    ...query,
    page,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
  };
}

export function useAsset(id: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset', tenantId, id],
    queryFn: async () => {
      if (!id || !tenantId) return null;
      const { getAssetById } = await import('@/features/assets/services/assetQueryService');
      return getAssetById(id, tenantId);
    },
    enabled: !!id && !!tenantId,
  });
}

export function useAssetCategories() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-categories', tenantId],
    queryFn: async () => {
      const { getAssetCategories } = await import('@/features/assets/services/assetQueryService');
      return getAssetCategories();
    },
  });
}

export function useAssetTypes(categoryId: string | null) {
  return useQuery({
    queryKey: ['asset-types', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { getAssetTypes } = await import('@/features/assets/services/assetQueryService');
      return getAssetTypes(categoryId);
    },
    enabled: !!categoryId,
  });
}

export function useAssetSubtypes(typeId: string | null) {
  return useQuery({
    queryKey: ['asset-subtypes', typeId],
    queryFn: async () => {
      if (!typeId) return [];
      const { getAssetSubtypes } = await import('@/features/assets/services/assetQueryService');
      return getAssetSubtypes(typeId);
    },
    enabled: !!typeId,
  });
}

export { getNextAssetSequence, generateAssetCode, generateSequentialCodes } from '@/features/assets/services/assetMutationService';

export function useCreateAsset() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (asset: Omit<AssetInsert, 'tenant_id' | 'created_by'>) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');
      const { createAsset } = await import('@/features/assets/services/assetMutationService');
      return createAsset(asset, profile.tenant_id, user.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(t('assets.createSuccess', { code: (data as any).asset_code }));
    },
    onError: (error: Error) => {
      console.error('Create asset error:', error);
      toast.error(error.message || t('assets.createError'));
    },
  });
}

export function useUpdateAsset() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AssetUpdate & { id: string }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');
      const { updateAsset } = await import('@/features/assets/services/assetMutationService');
      return updateAsset(id, updates, profile.tenant_id, user.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', profile?.tenant_id, data.id] });
      toast.success(t('assets.updateSuccess'));
    },
    onError: (error) => {
      console.error('Update asset error:', error);
      toast.error(t('assets.updateError'));
    },
  });
}

export function useDeleteAsset() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { softDeleteAsset } = await import('@/features/assets/services/assetMutationService');
      return softDeleteAsset(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets-trash', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['asset-dashboard-stats'] });
      toast.success(t('assets.trash.moveSuccess'));
    },
    onError: (error) => {
      console.error('Delete asset error:', error);
      toast.error(t('assets.trash.moveError'));
    },
  });
}

export function useAssetPhotos(assetId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-photos', tenantId, assetId],
    queryFn: async () => {
      if (!assetId || !tenantId) return [];
      const { getAssetPhotos } = await import('@/features/assets/services/assetQueryService');
      return getAssetPhotos(assetId, tenantId);
    },
    enabled: !!assetId && !!tenantId,
  });
}

export function useAssetDocuments(assetId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-documents', tenantId, assetId],
    queryFn: async () => {
      if (!assetId || !tenantId) return [];
      const { getAssetDocuments } = await import('@/features/assets/services/assetQueryService');
      return getAssetDocuments(assetId, tenantId);
    },
    enabled: !!assetId && !!tenantId,
  });
}

export function useAssetMaintenanceSchedules(assetId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-maintenance', tenantId, assetId],
    queryFn: async () => {
      if (!assetId || !tenantId) return [];
      const { getAssetMaintenanceSchedules } = await import('@/features/assets/services/assetQueryService');
      return getAssetMaintenanceSchedules(assetId, tenantId);
    },
    enabled: !!assetId && !!tenantId,
  });
}

export function useAssetAuditLogs(assetId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-audit-logs', tenantId, assetId],
    queryFn: async () => {
      if (!assetId || !tenantId) return [];
      const { getAssetAuditLogs } = await import('@/features/assets/services/assetQueryService');
      return getAssetAuditLogs(assetId, tenantId);
    },
    enabled: !!assetId && !!tenantId,
  });
}

export function useCreateBulkAssets() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      baseAsset: Omit<AssetInsert, 'tenant_id' | 'created_by' | 'asset_code'>;
      quantity: number;
      startCode: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');
      const { createBulkAssets } = await import('@/features/assets/services/assetMutationService');
      return createBulkAssets(params.baseAsset, params.quantity, params.startCode, profile.tenant_id, user.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(t('assets.bulkCreateSuccess', { count: data.length }));
    },
    onError: (error: Error) => {
      console.error('Bulk create assets error:', error);
      if ((error as any).code === '23505') {
        toast.error(t('assets.bulkConstraintError', {
          defaultValue: 'One or more asset codes conflict with existing records. Please refresh the page and try again.'
        }));
      } else {
        toast.error(error.message || t('assets.bulkCreateError'));
      }
    },
  });
}

