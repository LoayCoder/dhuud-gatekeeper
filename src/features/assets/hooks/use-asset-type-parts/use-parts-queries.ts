import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AssetTypePart } from './types';

export function useAssetTypeParts(typeId: string | undefined) {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    return useQuery({
        queryKey: ['asset-type-parts', 'type', typeId, tenantId],
        queryFn: async () => {
            if (!typeId || !tenantId) return [];
            const { data, error } = await supabase.from('asset_type_parts').select('*')
                .eq('type_id', typeId).eq('tenant_id', tenantId).is('subtype_id', null).is('deleted_at', null)
                .order('sort_order', { ascending: true }).order('name', { ascending: true });
            if (error) throw error;
            return data as AssetTypePart[];
        },
        enabled: !!typeId && !!tenantId,
    });
}

export function useSubtypeParts(subtypeId: string | undefined) {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    return useQuery({
        queryKey: ['asset-type-parts', 'subtype', subtypeId, tenantId],
        queryFn: async () => {
            if (!subtypeId || !tenantId) return [];
            const { data, error } = await supabase.from('asset_type_parts').select('*')
                .eq('subtype_id', subtypeId).is('type_id', null).is('deleted_at', null)
                .or(`tenant_id.eq.${tenantId},and(is_system.eq.true,tenant_id.is.null)`)
                .order('sort_order', { ascending: true }).order('name', { ascending: true });
            if (error) throw error;
            return data as AssetTypePart[];
        },
        enabled: !!subtypeId && !!tenantId,
    });
}

export function usePartsForAsset(typeId: string | undefined, subtypeId: string | undefined) {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    const useSubtype = !!subtypeId;
    const targetId = useSubtype ? subtypeId : typeId;
    return useQuery({
        queryKey: ['asset-type-parts', 'smart', targetId, useSubtype, tenantId],
        queryFn: async () => {
            if (!targetId || !tenantId) return [];
            let query = supabase.from('asset_type_parts').select('*')
                .or(`tenant_id.eq.${tenantId},and(is_system.eq.true,tenant_id.is.null)`)
                .eq('is_active', true).is('deleted_at', null)
                .order('sort_order', { ascending: true }).order('name', { ascending: true });
            if (useSubtype) { query = query.eq('subtype_id', subtypeId).is('type_id', null); }
            else { query = query.eq('type_id', typeId).is('subtype_id', null); }
            const { data, error } = await query;
            if (error) throw error;
            return data as AssetTypePart[];
        },
        enabled: !!targetId && !!tenantId,
    });
}

export function useActiveAssetTypeParts(typeId: string | undefined) {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    return useQuery({
        queryKey: ['asset-type-parts-active', typeId, tenantId],
        queryFn: async () => {
            if (!typeId || !tenantId) return [];
            const { data, error } = await supabase.from('asset_type_parts').select('*')
                .eq('type_id', typeId).eq('tenant_id', tenantId).eq('is_active', true).is('deleted_at', null)
                .order('sort_order', { ascending: true }).order('name', { ascending: true });
            if (error) throw error;
            return data as AssetTypePart[];
        },
        enabled: !!typeId && !!tenantId,
    });
}
