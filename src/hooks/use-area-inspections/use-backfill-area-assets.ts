import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Self-healing hook: backfills missing inspection_session_assets for area/audit
 * sessions that were started before the hybrid execution mode was deployed.
 * 
 * Runs once on mount. If session is in_progress with no execution_mode set,
 * checks for matching assets and populates them if found.
 */
export function useBackfillAreaAssets(
  sessionId: string | undefined,
  tenantId: string | undefined,
  sessionStatus: string | undefined,
  executionMode: string | null | undefined,
  sessionFilters: {
    branch_id?: string | null;
    site_id?: string | null;
    building_id?: string | null;
    category_id?: string | null;
    type_id?: string | null;
    subtype_id?: string | null;
  } | undefined
) {
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  useEffect(() => {
    if (
      hasRun.current ||
      !sessionId ||
      !tenantId ||
      sessionStatus !== 'in_progress' ||
      executionMode // Already has a mode set — skip
    ) {
      return;
    }

    hasRun.current = true;

    (async () => {
      try {
        // Check if session already has assets
        const { count: existingCount } = await supabase
          .from('inspection_session_assets')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId);

        if (existingCount && existingCount > 0) {
          // Already has assets — just set execution_mode
          await supabase
            .from('inspection_sessions')
            .update({ execution_mode: 'asset', total_assets: existingCount })
            .eq('id', sessionId);

          queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
          console.log(`[BackfillAreaAssets] Session ${sessionId} already has ${existingCount} assets, set execution_mode=asset`);
          return;
        }

        // Check if area_inspection_responses exist
        const { count: responseCount } = await supabase
          .from('area_inspection_responses')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .is('deleted_at', null);

        if (responseCount && responseCount > 0) {
          // Has checklist responses — set area mode
          await supabase
            .from('inspection_sessions')
            .update({ execution_mode: 'area' })
            .eq('id', sessionId);

          queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
          console.log(`[BackfillAreaAssets] Session ${sessionId} has ${responseCount} responses, set execution_mode=area`);
          return;
        }

        // Neither exists — try to find matching assets
        if (!sessionFilters) return;

        let assetQuery = supabase
          .from('hsse_assets')
          .select('id, name, asset_code, building:buildings(name), type:asset_types(name)')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null);

        if (sessionFilters.branch_id) assetQuery = assetQuery.eq('branch_id', sessionFilters.branch_id);
        if (sessionFilters.site_id) assetQuery = assetQuery.eq('site_id', sessionFilters.site_id);
        if (sessionFilters.building_id) assetQuery = assetQuery.eq('building_id', sessionFilters.building_id);
        if (sessionFilters.category_id) assetQuery = assetQuery.eq('category_id', sessionFilters.category_id);
        if (sessionFilters.type_id) assetQuery = assetQuery.eq('type_id', sessionFilters.type_id);
        if (sessionFilters.subtype_id) assetQuery = assetQuery.eq('subtype_id', sessionFilters.subtype_id);

        const { data: matchingAssets } = await assetQuery;

        if (matchingAssets && matchingAssets.length > 0) {
          const sessionAssets = matchingAssets.map(asset => ({
            tenant_id: tenantId,
            branch_id: sessionFilters.branch_id || null,
            session_id: sessionId,
            asset_id: asset.id,
            asset_name_snapshot: asset.name || null,
            asset_code_snapshot: asset.asset_code || null,
            asset_location_snapshot: (asset.building as any)?.name || null,
            asset_type_snapshot: (asset.type as any)?.name || null,
          }));

          const { error: insertError } = await supabase
            .from('inspection_session_assets')
            .insert(sessionAssets);

          if (insertError) {
            console.error('[BackfillAreaAssets] Insert error:', insertError);
            return;
          }

          await supabase
            .from('inspection_sessions')
            .update({ execution_mode: 'asset', total_assets: matchingAssets.length })
            .eq('id', sessionId);

          console.log(`[BackfillAreaAssets] Repaired session ${sessionId}: inserted ${matchingAssets.length} assets, set execution_mode=asset`);

          queryClient.invalidateQueries({ queryKey: ['session-assets', sessionId] });
          queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
          queryClient.invalidateQueries({ queryKey: ['session-progress', sessionId] });
        } else {
          // No assets found — set area mode
          await supabase
            .from('inspection_sessions')
            .update({ execution_mode: 'area' })
            .eq('id', sessionId);

          queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
          console.log(`[BackfillAreaAssets] No assets found for session ${sessionId}, set execution_mode=area`);
        }
      } catch (err) {
        console.error('[BackfillAreaAssets] Unexpected error:', err);
      }
    })();
  }, [sessionId, tenantId, sessionStatus, executionMode, sessionFilters, queryClient]);
}
