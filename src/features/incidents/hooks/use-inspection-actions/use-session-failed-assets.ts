import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FailedAssetSummary {
  id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  location: string;
  quick_result: string;
  failure_reason: string | null;
  notes: string | null;
  failed_parts: string[];
}

export function useSessionFailedAssets(sessionId: string | undefined, enabled = true) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['session-failed-assets', sessionId],
    queryFn: async (): Promise<FailedAssetSummary[]> => {
      if (!sessionId || !profile?.tenant_id) return [];

      // Fetch failed/partial session assets with asset details
      const { data: sessionAssets, error } = await supabase
        .from('inspection_session_assets' as never)
        .select(`
          id, asset_id, quick_result, failure_reason, notes,
          asset:hsse_assets!inspection_session_assets_asset_id_fkey(
            id, name, asset_code,
            building:buildings!hsse_assets_building_id_fkey(name),
            floor_zone:floor_zones!hsse_assets_floor_zone_id_fkey(name)
          )
        `)
        .eq('session_id', sessionId)
        .eq('tenant_id', profile.tenant_id)
        .in('quick_result', ['not_good', 'partial'])
        .is('deleted_at', null);

      if (error) throw error;
      if (!sessionAssets || sessionAssets.length === 0) return [];

      // Fetch failed part results for these session assets
      const sessionAssetIds = sessionAssets.map((sa: any) => sa.id);
      const { data: failedParts } = await supabase
        .from('asset_inspection_part_results' as never)
        .select(`
          inspection_id,
          part:asset_type_parts!asset_inspection_part_results_part_id_fkey(name)
        `)
        .in('inspection_id', sessionAssetIds)
        .eq('tenant_id', profile.tenant_id)
        .eq('result', 'fail')
        .is('deleted_at', null);

      // Group failed parts by session_asset_id
      const partsByAsset: Record<string, string[]> = {};
      if (failedParts) {
        for (const fp of failedParts as any[]) {
          const key = fp.inspection_id;
          if (!partsByAsset[key]) partsByAsset[key] = [];
          if (fp.part?.name) partsByAsset[key].push(fp.part.name);
        }
      }

      return sessionAssets.map((sa: any) => {
        const asset = sa.asset;
        const locationParts = [asset?.building?.name, asset?.floor_zone?.name].filter(Boolean);
        return {
          id: sa.id,
          asset_id: sa.asset_id,
          asset_code: asset?.asset_code || '',
          asset_name: asset?.name || '',
          location: locationParts.join(' / ') || '-',
          quick_result: sa.quick_result,
          failure_reason: sa.failure_reason,
          notes: sa.notes,
          failed_parts: partsByAsset[sa.id] || [],
        };
      });
    },
    enabled: !!sessionId && !!profile?.tenant_id && enabled,
  });
}
