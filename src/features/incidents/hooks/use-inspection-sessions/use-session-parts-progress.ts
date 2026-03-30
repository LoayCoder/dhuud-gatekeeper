/**
 * Hook to aggregate part inspection results across all assets in a session.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SessionPartsProgress {
  totalParts: number;
  completedParts: number;
  passedParts: number;
  failedParts: number;
  naParts: number;
  percentage: number;
}

export function useSessionPartsProgress(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-parts-progress', sessionId],
    queryFn: async (): Promise<SessionPartsProgress> => {
      if (!sessionId) return { totalParts: 0, completedParts: 0, passedParts: 0, failedParts: 0, naParts: 0, percentage: 0 };

      // Get all session asset IDs
      const { data: sessionAssets } = await supabase
        .from('inspection_session_assets')
        .select('id, asset:hsse_assets(type_id, subtype_id)')
        .eq('session_id', sessionId)
        .is('deleted_at', null);

      if (!sessionAssets || sessionAssets.length === 0) {
        return { totalParts: 0, completedParts: 0, passedParts: 0, failedParts: 0, naParts: 0, percentage: 0 };
      }

      // Collect unique type/subtype combos to count expected parts
      const typeIds = new Set<string>();
      const subtypeIds = new Set<string>();
      for (const sa of sessionAssets) {
        const asset = sa.asset as { type_id: string | null; subtype_id: string | null } | null;
        if (asset?.subtype_id) subtypeIds.add(asset.subtype_id);
        else if (asset?.type_id) typeIds.add(asset.type_id);
      }

      // Count expected parts per type/subtype
      let totalExpectedParts = 0;
      const partCountByKey = new Map<string, number>();

      if (subtypeIds.size > 0) {
        const { data: subtypeParts } = await supabase
          .from('asset_type_parts')
          .select('subtype_id')
          .in('subtype_id', Array.from(subtypeIds))
          .is('deleted_at', null);
        if (subtypeParts) {
          for (const p of subtypeParts) {
            const key = `subtype:${p.subtype_id}`;
            partCountByKey.set(key, (partCountByKey.get(key) || 0) + 1);
          }
        }
      }
      if (typeIds.size > 0) {
        const { data: typeParts } = await supabase
          .from('asset_type_parts')
          .select('type_id')
          .in('type_id', Array.from(typeIds))
          .is('subtype_id', null)
          .is('deleted_at', null);
        if (typeParts) {
          for (const p of typeParts) {
            const key = `type:${p.type_id}`;
            partCountByKey.set(key, (partCountByKey.get(key) || 0) + 1);
          }
        }
      }

      // Calculate total expected parts across all assets
      for (const sa of sessionAssets) {
        const asset = sa.asset as { type_id: string | null; subtype_id: string | null } | null;
        if (asset?.subtype_id) {
          totalExpectedParts += partCountByKey.get(`subtype:${asset.subtype_id}`) || 0;
        } else if (asset?.type_id) {
          totalExpectedParts += partCountByKey.get(`type:${asset.type_id}`) || 0;
        }
      }

      // Get completed part results
      const saIds = sessionAssets.map(sa => sa.id);
      const { data: partResults } = await supabase
        .from('asset_inspection_part_results')
        .select('result')
        .in('inspection_id', saIds)
        .is('deleted_at', null);

      const completedParts = partResults?.length || 0;
      const passedParts = partResults?.filter(r => r.result === 'pass').length || 0;
      const failedParts = partResults?.filter(r => r.result === 'fail').length || 0;
      const naParts = partResults?.filter(r => r.result === 'na').length || 0;

      return {
        totalParts: totalExpectedParts,
        completedParts,
        passedParts,
        failedParts,
        naParts,
        percentage: totalExpectedParts > 0 ? Math.round((completedParts / totalExpectedParts) * 100) : 0,
      };
    },
    enabled: !!sessionId,
    refetchInterval: 5000, // Caller should conditionally enable this hook for in_progress sessions
  });
}
