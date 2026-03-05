import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AssetTransfer } from './types';

export function useAssetTransfers(assetId: string | undefined) {
    return useQuery({
        queryKey: ['asset-transfers', assetId],
        queryFn: async () => {
            if (!assetId) return [];
            const { data, error } = await supabase.from('asset_transfers').select(`
        id, asset_id, transfer_type, status,
        from_branch_id, from_site_id, from_building_id, from_floor_zone_id,
        to_branch_id, to_site_id, to_building_id, to_floor_zone_id,
        disposal_method, disposal_value, disposal_notes,
        reason, notes, requested_by, requested_at, approved_by, approved_at,
        rejection_reason, completed_by, completed_at,
        from_branch:branches!asset_transfers_from_branch_id_fkey(id, name),
        from_site:sites!asset_transfers_from_site_id_fkey(id, name),
        from_building:buildings!asset_transfers_from_building_id_fkey(id, name, name_ar),
        from_floor_zone:floors_zones!asset_transfers_from_floor_zone_id_fkey(id, name, name_ar),
        to_branch:branches!asset_transfers_to_branch_id_fkey(id, name),
        to_site:sites!asset_transfers_to_site_id_fkey(id, name),
        to_building:buildings!asset_transfers_to_building_id_fkey(id, name, name_ar),
        to_floor_zone:floors_zones!asset_transfers_to_floor_zone_id_fkey(id, name, name_ar),
        requested_by_profile:profiles!asset_transfers_requested_by_fkey(id, full_name),
        approved_by_profile:profiles!asset_transfers_approved_by_fkey(id, full_name),
        completed_by_profile:profiles!asset_transfers_completed_by_fkey(id, full_name)
      `).eq('asset_id', assetId).is('deleted_at', null).order('requested_at', { ascending: false });
            if (error) throw error;
            return data as unknown as AssetTransfer[];
        },
        enabled: !!assetId,
    });
}

export function usePendingTransfers() {
    return useQuery({
        queryKey: ['pending-transfers'],
        queryFn: async () => {
            const { data, error } = await supabase.from('asset_transfers').select(`
        id, asset_id, transfer_type, status, reason, requested_at,
        asset:hsse_assets!asset_transfers_asset_id_fkey(id, name, asset_code),
        requested_by_profile:profiles!asset_transfers_requested_by_fkey(id, full_name)
      `).eq('status', 'pending').is('deleted_at', null).order('requested_at', { ascending: true }).limit(10);
            if (error) throw error;
            return data as unknown as AssetTransfer[];
        },
    });
}
