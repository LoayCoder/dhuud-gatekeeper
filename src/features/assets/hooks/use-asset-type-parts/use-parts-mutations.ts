import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { AssetTypePart, CreateAssetTypePartInput, UpdateAssetTypePartInput } from './types';

export function useCreateAssetTypePart() {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    const branchId = profile?.assigned_branch_id;
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    return useMutation({
        mutationFn: async (input: CreateAssetTypePartInput) => {
            if (!tenantId) throw new Error('No tenant ID');
            if (!input.type_id && !input.subtype_id) throw new Error('Either type_id or subtype_id must be provided');
            const { data, error } = await supabase.from('asset_type_parts')
                .insert({ ...input, code: input.code || '', tenant_id: tenantId, branch_id: branchId || null }).select().single();
            if (error) throw error;
            return data as AssetTypePart;
        },
        onSuccess: (data) => {
            if (data.type_id) queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'type', data.type_id] });
            if (data.subtype_id) queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'subtype', data.subtype_id] });
            queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'smart'] });
            toast.success(t('assetParts.created', 'Part created successfully'));
        },
        onError: (error: Error) => { console.error('Failed to create asset type part:', error); toast.error(t('assetParts.createFailed', 'Failed to create part')); },
    });
}

export function useUpdateAssetTypePart() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    return useMutation({
        mutationFn: async (input: UpdateAssetTypePartInput) => {
            const { id, ...updates } = input;
            const { data, error } = await supabase.from('asset_type_parts')
                .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
            if (error) throw error;
            return data as AssetTypePart;
        },
        onSuccess: (data) => {
            if (data.type_id) queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'type', data.type_id] });
            if (data.subtype_id) queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'subtype', data.subtype_id] });
            queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'smart'] });
            toast.success(t('assetParts.updated', 'Part updated successfully'));
        },
        onError: (error: Error) => { console.error('Failed to update asset type part:', error); toast.error(t('assetParts.updateFailed', 'Failed to update part')); },
    });
}

export function useDeleteAssetTypePart() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    return useMutation({
        mutationFn: async ({ id, typeId, subtypeId }: { id: string; typeId?: string; subtypeId?: string }) => {
            const { error } = await supabase.from('asset_type_parts').update({ deleted_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
            return { id, typeId, subtypeId };
        },
        onSuccess: (data) => {
            if (data.typeId) queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'type', data.typeId] });
            if (data.subtypeId) queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'subtype', data.subtypeId] });
            queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'smart'] });
            toast.success(t('assetParts.deleted', 'Part deleted successfully'));
        },
        onError: (error: Error) => { console.error('Failed to delete asset type part:', error); toast.error(t('assetParts.deleteFailed', 'Failed to delete part')); },
    });
}

export function useReorderAssetTypeParts() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ typeId, subtypeId, parts }: { typeId?: string; subtypeId?: string; parts: { id: string; sort_order: number }[] }) => {
            const updates = parts.map((part) => supabase.from('asset_type_parts').update({ sort_order: part.sort_order, updated_at: new Date().toISOString() }).eq('id', part.id));
            await Promise.all(updates);
            return { typeId, subtypeId };
        },
        onSuccess: (data) => {
            if (data.typeId) queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'type', data.typeId] });
            if (data.subtypeId) queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'subtype', data.subtypeId] });
            queryClient.invalidateQueries({ queryKey: ['asset-type-parts', 'smart'] });
        },
    });
}
