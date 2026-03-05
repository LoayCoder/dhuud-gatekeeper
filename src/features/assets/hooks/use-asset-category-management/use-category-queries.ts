import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AssetCategory, AssetType, AssetSubtype } from './types';

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
