import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { AssetCategoryInsert, AssetCategoryUpdate, AssetTypeInsert, AssetTypeUpdate, AssetSubtypeInsert, AssetSubtypeUpdate } from './types';

// ==================== CATEGORY MUTATIONS ====================

export function useCreateAssetCategory() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (category: Omit<AssetCategoryInsert, 'tenant_id'> & { hsse_category?: string | null; hsse_type?: string | null }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('user_id', user.id)
                .single();

            if (!profile?.tenant_id) throw new Error('No tenant found');

            const { hsse_category, hsse_type, ...rest } = category;

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
                } as unknown)
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

// ==================== TYPE MUTATIONS ====================

export function useCreateAssetType() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (type: Omit<AssetTypeInsert, 'tenant_id'>) => {
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

// ==================== SUBTYPE MUTATIONS ====================

export function useCreateAssetSubtype() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (subtype: Omit<AssetSubtypeInsert, 'tenant_id'>) => {
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
