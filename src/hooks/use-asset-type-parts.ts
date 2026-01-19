/**
 * Asset Type Parts Hook
 * 
 * CRUD operations for managing inspectable parts attached to asset types or subtypes.
 * Supports dynamic linking: parts can be on Type (if no subtype) or Subtype (if exists).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface AssetTypePart {
  id: string;
  tenant_id: string;
  type_id: string | null;         // Nullable - parts can be on subtype instead
  subtype_id: string | null;      // NEW: Link to subtype
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
  content_count: number | null;       // NEW: Optional quantity
  content_count_label: string | null; // NEW: e.g., "pieces", "wipes"
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  branch_id: string | null;
}

export interface CreateAssetTypePartInput {
  type_id?: string | null;
  subtype_id?: string | null;
  code?: string; // Optional - auto-generated if not provided
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  is_critical?: boolean;
  default_response_type?: 'pass_fail' | 'condition_rating' | 'numeric';
  sort_order?: number;
  content_count?: number | null;
  content_count_label?: string | null;
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
  content_count?: number | null;
  content_count_label?: string | null;
}

/**
 * Fetch all parts for a specific asset type (NOT subtypes)
 */
export function useAssetTypeParts(typeId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-type-parts', 'type', typeId, tenantId],
    queryFn: async () => {
      if (!typeId || !tenantId) return [];

      const { data, error } = await supabase
        .from('asset_type_parts')
        .select('*')
        .eq('type_id', typeId)
        .eq('tenant_id', tenantId)
        .is('subtype_id', null)
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
 * Fetch all parts for a specific asset subtype
 * Includes both tenant-specific parts AND system-wide parts (is_system=true, tenant_id=null)
 */
export function useSubtypeParts(subtypeId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-type-parts', 'subtype', subtypeId, tenantId],
    queryFn: async () => {
      if (!subtypeId || !tenantId) return [];

      const { data, error } = await supabase
        .from('asset_type_parts')
        .select('*')
        .eq('subtype_id', subtypeId)
        .is('type_id', null)
        .is('deleted_at', null)
        .or(`tenant_id.eq.${tenantId},and(is_system.eq.true,tenant_id.is.null)`)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as AssetTypePart[];
    },
    enabled: !!subtypeId && !!tenantId,
  });
}

/**
 * Smart fetcher: Get parts for an asset based on its type/subtype config
 * - If subtype exists → fetch parts from subtype
 * - If no subtype → fetch parts from type
 */
export function usePartsForAsset(typeId: string | undefined, subtypeId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  // Determine which ID to use
  const useSubtype = !!subtypeId;
  const targetId = useSubtype ? subtypeId : typeId;

  return useQuery({
    queryKey: ['asset-type-parts', 'smart', targetId, useSubtype, tenantId],
    queryFn: async () => {
      if (!targetId || !tenantId) return [];

      let query = supabase
        .from('asset_type_parts')
        .select('*')
        .or(`tenant_id.eq.${tenantId},and(is_system.eq.true,tenant_id.is.null)`)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (useSubtype) {
        query = query.eq('subtype_id', subtypeId).is('type_id', null);
      } else {
        query = query.eq('type_id', typeId).is('subtype_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AssetTypePart[];
    },
    enabled: !!targetId && !!tenantId,
  });
}

/**
 * Fetch all active parts for a specific asset type (for inspections) - LEGACY
 * Use usePartsForAsset for smart type/subtype handling
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
 * Code is auto-generated by database trigger if not provided
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
      
      // Validate that either type_id or subtype_id is provided
      if (!input.type_id && !input.subtype_id) {
        throw new Error('Either type_id or subtype_id must be provided');
      }

      const { data, error } = await supabase
        .from('asset_type_parts')
        .insert({
          ...input,
          code: input.code || '', // Empty code triggers auto-generation
          tenant_id: tenantId,
          branch_id: branchId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AssetTypePart;
    },
    onSuccess: (data) => {
      // Invalidate both type and subtype queries
      if (data.type_id) {
        queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'type', data.type_id] });
      }
      if (data.subtype_id) {
        queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'subtype', data.subtype_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'smart'] });
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
      if (data.type_id) {
        queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'type', data.type_id] });
      }
      if (data.subtype_id) {
        queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'subtype', data.subtype_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'smart'] });
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
    mutationFn: async ({ id, typeId, subtypeId }: { id: string; typeId?: string; subtypeId?: string }) => {
      const { error } = await supabase
        .from('asset_type_parts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { id, typeId, subtypeId };
    },
    onSuccess: (data) => {
      if (data.typeId) {
        queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'type', data.typeId] });
      }
      if (data.subtypeId) {
        queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'subtype', data.subtypeId] });
      }
      queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'smart'] });
      toast.success(t('assetParts.deleted', 'Part deleted successfully'));
    },
    onError: (error: Error) => {
      console.error('Failed to delete asset type part:', error);
      toast.error(t('assetParts.deleteFailed', 'Failed to delete part'));
    },
  });
}

/**
 * Reorder parts within an asset type or subtype
 */
export function useReorderAssetTypeParts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      typeId, 
      subtypeId, 
      parts 
    }: { 
      typeId?: string; 
      subtypeId?: string; 
      parts: { id: string; sort_order: number }[] 
    }) => {
      // Update each part's sort_order
      const updates = parts.map((part) =>
        supabase
          .from('asset_type_parts')
          .update({ sort_order: part.sort_order, updated_at: new Date().toISOString() })
          .eq('id', part.id)
      );

      await Promise.all(updates);
      return { typeId, subtypeId };
    },
    onSuccess: (data) => {
      if (data.typeId) {
        queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'type', data.typeId] });
      }
      if (data.subtypeId) {
        queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'subtype', data.subtypeId] });
      }
      queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'smart'] });
    },
  });
}
