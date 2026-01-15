/**
 * Asset Type Parts Hook
 * 
 * CRUD operations for managing inspectable parts attached to asset types.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface AssetTypePart {
  id: string;
  tenant_id: string;
  type_id: string;
  code: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  is_critical: boolean;
  default_response_type: 'pass_fail' | 'condition_rating' | 'numeric';
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  branch_id: string | null;
}

export interface CreateAssetTypePartInput {
  type_id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  is_critical?: boolean;
  default_response_type?: 'pass_fail' | 'condition_rating' | 'numeric';
  sort_order?: number;
}

export interface UpdateAssetTypePartInput {
  id: string;
  code?: string;
  name?: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  is_critical?: boolean;
  default_response_type?: 'pass_fail' | 'condition_rating' | 'numeric';
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Fetch all parts for a specific asset type
 */
export function useAssetTypeParts(typeId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-type-parts', typeId, tenantId],
    queryFn: async () => {
      if (!typeId || !tenantId) return [];

      const { data, error } = await supabase
        .from('asset_type_parts')
        .select('*')
        .eq('type_id', typeId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as AssetTypePart[];
    },
    enabled: !!typeId && !!tenantId,
  });
}

/**
 * Fetch all active parts for a specific asset type (for inspections)
 */
export function useActiveAssetTypeParts(typeId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-type-parts-active', typeId, tenantId],
    queryFn: async () => {
      if (!typeId || !tenantId) return [];

      const { data, error } = await supabase
        .from('asset_type_parts')
        .select('*')
        .eq('type_id', typeId)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as AssetTypePart[];
    },
    enabled: !!typeId && !!tenantId,
  });
}

/**
 * Create a new asset type part
 */
export function useCreateAssetTypePart() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const branchId = profile?.assigned_branch_id;
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: CreateAssetTypePartInput) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('asset_type_parts')
        .insert({
          ...input,
          tenant_id: tenantId,
          branch_id: branchId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AssetTypePart;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['asset-type-parts', variables.type_id] });
      toast.success(t('assetParts.created', 'Part created successfully'));
    },
    onError: (error: Error) => {
      console.error('Failed to create asset type part:', error);
      toast.error(t('assetParts.createFailed', 'Failed to create part'));
    },
  });
}

/**
 * Update an existing asset type part
 */
export function useUpdateAssetTypePart() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: UpdateAssetTypePartInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('asset_type_parts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AssetTypePart;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-type-parts', data.type_id] });
      toast.success(t('assetParts.updated', 'Part updated successfully'));
    },
    onError: (error: Error) => {
      console.error('Failed to update asset type part:', error);
      toast.error(t('assetParts.updateFailed', 'Failed to update part'));
    },
  });
}

/**
 * Soft delete an asset type part
 */
export function useDeleteAssetTypePart() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, typeId }: { id: string; typeId: string }) => {
      const { error } = await supabase
        .from('asset_type_parts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { id, typeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-type-parts', data.typeId] });
      toast.success(t('assetParts.deleted', 'Part deleted successfully'));
    },
    onError: (error: Error) => {
      console.error('Failed to delete asset type part:', error);
      toast.error(t('assetParts.deleteFailed', 'Failed to delete part'));
    },
  });
}

/**
 * Reorder parts within an asset type
 */
export function useReorderAssetTypeParts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ typeId, parts }: { typeId: string; parts: { id: string; sort_order: number }[] }) => {
      // Update each part's sort_order
      const updates = parts.map((part) =>
        supabase
          .from('asset_type_parts')
          .update({ sort_order: part.sort_order, updated_at: new Date().toISOString() })
          .eq('id', part.id)
      );

      await Promise.all(updates);
      return { typeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-type-parts', data.typeId] });
    },
  });
}
