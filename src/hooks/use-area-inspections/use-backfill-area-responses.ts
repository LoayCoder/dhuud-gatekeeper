import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Self-healing hook: backfills missing area_inspection_responses for sessions
 * that were started before the area/audit branching fix was deployed.
 * 
 * Runs once on mount when session is in_progress. Compares template items
 * against existing responses and inserts any missing rows.
 */
export function useBackfillAreaResponses(
  sessionId: string | undefined,
  templateId: string | undefined,
  tenantId: string | undefined,
  sessionStatus: string | undefined,
  branchId: string | null | undefined
) {
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  useEffect(() => {
    if (
      hasRun.current ||
      !sessionId ||
      !templateId ||
      !tenantId ||
      sessionStatus !== 'in_progress'
    ) {
      return;
    }

    hasRun.current = true;

    (async () => {
      try {
        // 1. Fetch all template items
        const { data: templateItems, error: itemsError } = await supabase
          .from('inspection_template_items')
          .select('id')
          .eq('template_id', templateId)
          .is('deleted_at', null);

        if (itemsError || !templateItems) return;

        // 2. Fetch existing response template_item_ids
        const { data: existingResponses, error: respError } = await supabase
          .from('area_inspection_responses')
          .select('template_item_id')
          .eq('session_id', sessionId)
          .is('deleted_at', null);

        if (respError) return;

        const existingSet = new Set(
          (existingResponses || []).map((r) => r.template_item_id)
        );

        // 3. Find missing items
        const missingItems = templateItems.filter(
          (item) => !existingSet.has(item.id)
        );

        if (missingItems.length === 0) {
          // Still fix total_assets if it's wrong
          const { data: session } = await supabase
            .from('inspection_sessions')
            .select('total_assets')
            .eq('id', sessionId)
            .single();

          if (session && session.total_assets !== templateItems.length) {
            await supabase
              .from('inspection_sessions')
              .update({ total_assets: templateItems.length })
              .eq('id', sessionId);

            queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['area-checklist-progress', sessionId] });
          }
          return;
        }

        // 4. Insert missing response rows
        const rowsToInsert = missingItems.map((item) => ({
          session_id: sessionId,
          template_item_id: item.id,
          tenant_id: tenantId,
          branch_id: branchId || null,
          result: null,
          response_value: null,
          notes: null,
          photo_paths: [],
        }));

        const { error: insertError } = await supabase
          .from('area_inspection_responses')
          .insert(rowsToInsert);

        if (insertError) {
          console.error('[BackfillAreaResponses] Insert error:', insertError);
          return;
        }

        // 5. Correct total_assets
        await supabase
          .from('inspection_sessions')
          .update({ total_assets: templateItems.length })
          .eq('id', sessionId);

        console.log(
          `[BackfillAreaResponses] Repaired session ${sessionId}: inserted ${missingItems.length} missing responses, total_assets → ${templateItems.length}`
        );

        // 6. Invalidate queries so UI refreshes
        queryClient.invalidateQueries({ queryKey: ['area-inspection-responses', sessionId] });
        queryClient.invalidateQueries({ queryKey: ['area-checklist-progress', sessionId] });
        queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
      } catch (err) {
        console.error('[BackfillAreaResponses] Unexpected error:', err);
      }
    })();
  }, [sessionId, templateId, tenantId, sessionStatus, branchId, queryClient]);
}
