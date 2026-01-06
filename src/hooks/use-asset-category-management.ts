import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Database } from '@/integrations/supabase/types';

type AssetCategory = Database['public']['Tables']['asset_categories']['Row'];
type AssetCategoryInsert = Database['public']['Tables']['asset_categories']['Insert'];
type AssetCategoryUpdate = Database['public']['Tables']['asset_categories']['Update'];

type AssetType = Database['public']['Tables']['asset_types']['Row'];
type AssetTypeInsert = Database['public']['Tables']['asset_types']['Insert'];
type AssetTypeUpdate = Database['public']['Tables']['asset_types']['Update'];

type AssetSubtype = Database['public']['Tables']['asset_subtypes']['Row'];
type AssetSubtypeInsert = Database['public']['Tables']['asset_subtypes']['Insert'];
type AssetSubtypeUpdate = Database['public']['Tables']['asset_subtypes']['Update'];

// ==================== CATEGORIES ====================

export function useAllAssetCategories() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-categories-all', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_categories')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as AssetCategory[];
    },
  });
}

export function useCreateAssetCategory() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: Omit<AssetCategoryInsert, 'tenant_id'> & { hsse_category?: string | null; hsse_type?: string | null }) => {
      // Fetch tenant_id at mutation time to avoid race condition
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { hsse_category, hsse_type, ...rest } = category;
      
      // Insert with extra HSSE fields (they exist in DB but not in generated types yet)
      const { data, error } = await supabase
        .from('asset_categories')
        .insert({
          ...rest,
          tenant_id: profile.tenant_id,
          ...(hsse_category !== undefined && { hsse_category }),
          ...(hsse_type !== undefined && { hsse_type }),
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories-all'] });
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      toast.success(t('assetCategories.createSuccess'));
    },
    onError: (error) => {
      console.error('Create asset category error:', error);
      toast.error(t('assetCategories.createError'));
    },
  });
}

export function useUpdateAssetCategory() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, hsse_category, hsse_type, ...updates }: AssetCategoryUpdate & { id: string; hsse_category?: string | null; hsse_type?: string | null }) => {
      const { data, error } = await supabase
        .from('asset_categories')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          ...(hsse_category !== undefined && { hsse_category }),
          ...(hsse_type !== undefined && { hsse_type }),
        } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories-all'] });
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      toast.success(t('assetCategories.updateSuccess'));
    },
    onError: (error) => {
      console.error('Update asset category error:', error);
      toast.error(t('assetCategories.updateError'));
    },
  });
}

export function useToggleAssetCategory() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('asset_categories')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories-all'] });
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      toast.success(is_active ? t('assetCategories.enabled') : t('assetCategories.disabled'));
    },
    onError: (error) => {
      console.error('Toggle asset category error:', error);
      toast.error(t('assetCategories.toggleError'));
    },
  });
}

export function useDeleteAssetCategory() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('asset_categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories-all'] });
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      toast.success(t('assetCategories.deleteSuccess'));
    },
    onError: (error) => {
      console.error('Delete asset category error:', error);
      toast.error(t('assetCategories.deleteError'));
    },
  });
}

// ==================== TYPES ====================

export function useAllAssetTypes(categoryId?: string | null) {
  return useQuery({
    queryKey: ['asset-types-all', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('asset_types')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AssetType[];
    },
  });
}

export function useCreateAssetType() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: Omit<AssetTypeInsert, 'tenant_id'>) => {
      // Fetch tenant_id at mutation time to avoid race condition
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { data, error } = await supabase
        .from('asset_types')
        .insert({
          ...type,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types-all'] });
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      toast.success(t('assetCategories.typeCreateSuccess'));
    },
    onError: (error) => {
      console.error('Create asset type error:', error);
      toast.error(t('assetCategories.typeCreateError'));
    },
  });
}

export function useUpdateAssetType() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AssetTypeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('asset_types')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types-all'] });
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      toast.success(t('assetCategories.typeUpdateSuccess'));
    },
    onError: (error) => {
      console.error('Update asset type error:', error);
      toast.error(t('assetCategories.typeUpdateError'));
    },
  });
}

export function useToggleAssetType() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('asset_types')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['asset-types-all'] });
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      toast.success(is_active ? t('assetCategories.typeEnabled') : t('assetCategories.typeDisabled'));
    },
    onError: (error) => {
      console.error('Toggle asset type error:', error);
      toast.error(t('assetCategories.typeToggleError'));
    },
  });
}

export function useDeleteAssetType() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('asset_types')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types-all'] });
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      toast.success(t('assetCategories.typeDeleteSuccess'));
    },
    onError: (error) => {
      console.error('Delete asset type error:', error);
      toast.error(t('assetCategories.typeDeleteError'));
    },
  });
}

// ==================== SUBTYPES ====================

export function useAllAssetSubtypes(typeId?: string | null) {
  return useQuery({
    queryKey: ['asset-subtypes-all', typeId],
    queryFn: async () => {
      let query = supabase
        .from('asset_subtypes')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (typeId) {
        query = query.eq('type_id', typeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AssetSubtype[];
    },
  });
}

export function useCreateAssetSubtype() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subtype: Omit<AssetSubtypeInsert, 'tenant_id'>) => {
      // Fetch tenant_id at mutation time to avoid race condition
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { data, error } = await supabase
        .from('asset_subtypes')
        .insert({
          ...subtype,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-subtypes-all'] });
      queryClient.invalidateQueries({ queryKey: ['asset-subtypes'] });
      toast.success(t('assetCategories.subtypeCreateSuccess'));
    },
    onError: (error) => {
      console.error('Create asset subtype error:', error);
      toast.error(t('assetCategories.subtypeCreateError'));
    },
  });
}

export function useUpdateAssetSubtype() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AssetSubtypeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('asset_subtypes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-subtypes-all'] });
      queryClient.invalidateQueries({ queryKey: ['asset-subtypes'] });
      toast.success(t('assetCategories.subtypeUpdateSuccess'));
    },
    onError: (error) => {
      console.error('Update asset subtype error:', error);
      toast.error(t('assetCategories.subtypeUpdateError'));
    },
  });
}

export function useToggleAssetSubtype() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('asset_subtypes')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['asset-subtypes-all'] });
      queryClient.invalidateQueries({ queryKey: ['asset-subtypes'] });
      toast.success(is_active ? t('assetCategories.subtypeEnabled') : t('assetCategories.subtypeDisabled'));
    },
    onError: (error) => {
      console.error('Toggle asset subtype error:', error);
      toast.error(t('assetCategories.subtypeToggleError'));
    },
  });
}

export function useDeleteAssetSubtype() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('asset_subtypes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-subtypes-all'] });
      queryClient.invalidateQueries({ queryKey: ['asset-subtypes'] });
      toast.success(t('assetCategories.subtypeDeleteSuccess'));
    },
    onError: (error) => {
      console.error('Delete asset subtype error:', error);
      toast.error(t('assetCategories.subtypeDeleteError'));
    },
  });
}

// ==================== ASSET COUNTS ====================

export function useCategoryAssetCounts() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-category-counts', tenantId],
    queryFn: async () => {
      if (!tenantId) return {};

      const { data, error } = await supabase
        .from('hsse_assets')
        .select('category_id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((asset) => {
        if (asset.category_id) {
          counts[asset.category_id] = (counts[asset.category_id] || 0) + 1;
        }
      });

      return counts;
    },
    enabled: !!tenantId,
  });
}

export function useTypeAssetCounts() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-type-counts', tenantId],
    queryFn: async () => {
      if (!tenantId) return {};

      const { data, error } = await supabase
        .from('hsse_assets')
        .select('type_id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((asset) => {
        if (asset.type_id) {
          counts[asset.type_id] = (counts[asset.type_id] || 0) + 1;
        }
      });

      return counts;
    },
    enabled: !!tenantId,
  });
}
