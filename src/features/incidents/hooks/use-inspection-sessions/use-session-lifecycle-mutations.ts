import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CreateSessionInput, RecordInspectionInput } from './types';

// Hook: Create new session
export function useCreateSession() {
    const queryClient = useQueryClient();
    const { profile, user } = useAuth();

    return useMutation({
        mutationFn: async (input: CreateSessionInput) => {
            if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('inspection_sessions')
                .insert({
                    ...input,
                    tenant_id: profile.tenant_id,
                    inspector_id: user.id,
                    status: 'draft',
                })
                .select()
                .single()
                .throwOnError();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
        },
    });
}

// Hook: Start session (change status to in_progress and populate assets)
export function useStartSession() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();

    return useMutation({
        mutationFn: async (sessionId: string) => {
            if (!profile?.tenant_id) throw new Error('Not authenticated');

            // Get session details to know filters and session type
            const { data: session, error: sessionError } = await supabase
                .from('inspection_sessions')
                .select('id, tenant_id, session_type, template_id, branch_id, site_id, building_id, floor_zone_id, category_id, type_id, subtype_id')
                .eq('id', sessionId)
                .single();

            if (sessionError) throw sessionError;

            let totalCount = 0;
            let executionMode: 'asset' | 'area' = 'area';

            if (session.session_type === 'area' || session.session_type === 'audit') {
                // --- Area / Audit: check for matching assets first ---
                if (!session.template_id) {
                    throw new Error('Session has no template assigned.');
                }

                // Try to find matching assets for asset-based execution mode
                let assetQuery = supabase
                    .from('hsse_assets')
                    .select('id, name, asset_code, building:buildings(name), type:asset_types(name)')
                    .eq('tenant_id', profile.tenant_id)
                    .is('deleted_at', null);

                if (session.branch_id) assetQuery = assetQuery.eq('branch_id', session.branch_id);
                if (session.site_id) assetQuery = assetQuery.eq('site_id', session.site_id);
                if (session.building_id) assetQuery = assetQuery.eq('building_id', session.building_id);
                if (session.floor_zone_id) assetQuery = assetQuery.eq('floor_zone_id', session.floor_zone_id);
                if (session.category_id) assetQuery = assetQuery.eq('category_id', session.category_id);
                if (session.type_id) assetQuery = assetQuery.eq('type_id', session.type_id);
                if (session.subtype_id) assetQuery = assetQuery.eq('subtype_id', session.subtype_id);

                const { data: matchingAssets } = await assetQuery;

                if (matchingAssets && matchingAssets.length > 0) {
                    // --- ASSET execution mode: per-asset checklists ---
                    executionMode = 'asset';
                    totalCount = matchingAssets.length;

                    const sessionAssets = matchingAssets.map(asset => ({
                        tenant_id: profile.tenant_id,
                        branch_id: session.branch_id || null,
                        session_id: sessionId,
                        asset_id: asset.id,
                        asset_name_snapshot: asset.name || null,
                        asset_code_snapshot: asset.asset_code || null,
                        asset_location_snapshot: (asset.building as { name: string } | null)?.name || null,
                        asset_type_snapshot: (asset.type as { name: string } | null)?.name || null,
                    }));

                    const { error: insertError } = await supabase
                        .from('inspection_session_assets')
                        .insert(sessionAssets);

                    if (insertError) throw insertError;

                    console.log(`[StartSession] Asset mode: inserted ${totalCount} assets for area/audit session ${sessionId}`);
                } else {
                    // --- AREA execution mode: flat checklist ---
                    executionMode = 'area';

                    const { data: templateItems, error: itemsError } = await supabase
                        .from('inspection_template_items')
                        .select('id')
                        .eq('template_id', session.template_id)
                        .is('deleted_at', null)
                        .order('sort_order');

                    if (itemsError) throw itemsError;

                    totalCount = templateItems?.length || 0;
                    if (totalCount === 0) {
                        throw new Error('Template has no checklist items. Add items to the template first.');
                    }

                    const responseRows = templateItems!.map(item => ({
                        tenant_id: profile.tenant_id,
                        branch_id: session.branch_id || null,
                        session_id: sessionId,
                        template_item_id: item.id,
                        result: null,
                        response_value: null,
                    }));

                    const { error: insertError } = await supabase
                        .from('area_inspection_responses')
                        .insert(responseRows);

                    if (insertError) throw insertError;

                    console.log(`[StartSession] Area mode: inserted ${totalCount} checklist responses for session ${sessionId}`);
                }

            } else {
                // --- Asset session type: always asset mode ---
                executionMode = 'asset';

                let assetQuery = supabase
                    .from('hsse_assets')
                    .select('id, name, asset_code, building:buildings(name), type:asset_types(name)')
                    .eq('tenant_id', profile.tenant_id)
                    .is('deleted_at', null);

                if (session.branch_id) assetQuery = assetQuery.eq('branch_id', session.branch_id);
                if (session.site_id) assetQuery = assetQuery.eq('site_id', session.site_id);
                if (session.building_id) assetQuery = assetQuery.eq('building_id', session.building_id);
                if (session.floor_zone_id) assetQuery = assetQuery.eq('floor_zone_id', session.floor_zone_id);
                if (session.category_id) assetQuery = assetQuery.eq('category_id', session.category_id);
                if (session.type_id) assetQuery = assetQuery.eq('type_id', session.type_id);
                if (session.subtype_id) assetQuery = assetQuery.eq('subtype_id', session.subtype_id);

                const { data: assets, error: assetsError } = await assetQuery;
                if (assetsError) throw assetsError;

                totalCount = assets?.length || 0;
                if (totalCount === 0) {
                    throw new Error('No assets match the session scope. Add assets or adjust filters.');
                }

                const sessionAssets = assets!.map(asset => ({
                    tenant_id: profile.tenant_id,
                    branch_id: session.branch_id || null,
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

                if (insertError) throw insertError;
            }

            // Update session status to in_progress and set total count + execution mode
            const { data, error } = await supabase
                .from('inspection_sessions')
                .update({
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
                    total_assets: totalCount,
                    execution_mode: executionMode,
                })
                .eq('id', sessionId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, sessionId) => {
            queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['session-assets', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['area-sessions'] });
        },
    });
}

// Hook: Record asset inspection result
export function useRecordAssetInspection() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (input: RecordInspectionInput) => {
            if (!user?.id) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('inspection_session_assets')
                .update({
                    quick_result: input.quick_result,
                    failure_reason: input.failure_reason || null,
                    notes: input.notes || null,
                    gps_lat: input.gps_lat || null,
                    gps_lng: input.gps_lng || null,
                    photo_paths: input.photo_paths || [],
                    inspected_at: new Date().toISOString(),
                    inspected_by: user.id,
                })
                .eq('id', input.session_asset_id)
                .select(`*, asset:hsse_assets(id)`)
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: async (data) => {
            // Get session_id from the returned data to invalidate correct queries
            const sessionId = data.session_id;

            // Sync session-level counters from inspection_session_assets
            try {
                const { data: rows } = await supabase
                    .from('inspection_session_assets')
                    .select('quick_result')
                    .eq('session_id', sessionId)
                    .is('deleted_at', null);

                if (rows) {
                    const total = rows.length;
                    const inspected = rows.filter(r => r.quick_result !== null).length;
                    const passed = rows.filter(r => r.quick_result === 'good').length;
                    const failed = rows.filter(r => r.quick_result === 'not_good').length;
                    const notAccessible = rows.filter(r => r.quick_result === 'not_accessible').length;
                    const partial = rows.filter(r => r.quick_result === 'partial').length;
                    const denom = passed + failed + partial;

                    await supabase
                        .from('inspection_sessions')
                        .update({
                            total_assets: total,
                            inspected_count: inspected,
                            passed_count: passed,
                            failed_count: failed,
                            not_accessible_count: notAccessible,
                            compliance_percentage: denom > 0 ? Math.round((passed / denom) * 100) : null,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', sessionId);
                }
            } catch (err) {
                console.warn('[RecordInspection] Failed to sync session counters:', err);
            }

            queryClient.invalidateQueries({ queryKey: ['session-assets', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['session-assets-uninspected', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['session-progress', sessionId] });
        },
    });
}

// Hook: Complete session
export function useCompleteSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (sessionId: string) => {
            // Check if there are any failed items (which means open actions)
            // Count failed items: both 'not_good' and 'partial' indicate issues
            const { count: failedCount } = await supabase
                .from('inspection_session_assets')
                .select('id', { count: 'exact', head: true })
                .eq('session_id', sessionId)
                .is('deleted_at', null)
                .in('quick_result', ['not_good', 'partial']);

            const hasOpenActions = (failedCount ?? 0) > 0;

            // Aggregate part-level results for completion metadata
            const { data: sessionAssetIds } = await supabase
                .from('inspection_session_assets')
                .select('id')
                .eq('session_id', sessionId);

            let partsSummary = { total: 0, passed: 0, failed: 0, na: 0 };
            if (sessionAssetIds && sessionAssetIds.length > 0) {
                const ids = sessionAssetIds.map(sa => sa.id);
                const { data: partResults } = await supabase
                    .from('asset_inspection_part_results')
                    .select('result')
                    .in('inspection_id', ids)
                    .is('deleted_at', null);

                if (partResults) {
                    partsSummary.total = partResults.length;
                    partsSummary.passed = partResults.filter(r => r.result === 'pass').length;
                    partsSummary.failed = partResults.filter(r => r.result === 'fail').length;
                    partsSummary.na = partResults.filter(r => r.result === 'na').length;
                }
            }

            const { data, error } = await supabase
                .from('inspection_sessions')
                .update({
                    status: hasOpenActions ? 'completed_with_open_actions' : 'closed',
                    completed_at: new Date().toISOString(),
                    closed_at: hasOpenActions ? null : new Date().toISOString(),
                    ai_summary: JSON.stringify({ parts: partsSummary }),
                })
                .eq('id', sessionId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, sessionId) => {
            queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
        },
    });
}

// Hook: Close session (after all actions are done)
export function useCloseSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (sessionId: string) => {
            const { data, error } = await supabase
                .from('inspection_sessions')
                .update({ status: 'closed', updated_at: new Date().toISOString() })
                .eq('id', sessionId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, sessionId) => {
            queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
        },
    });
}

// Update an existing inspection session
export function useUpdateSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            sessionId,
            updates
        }: {
            sessionId: string;
            updates: Partial<{
                period: string;
                site_id: string | null;
                building_id: string | null;
                category_id: string | null;
                type_id: string | null;
                subtype_id: string | null;
                branch_id: string | null;
            }>;
        }) => {
            const { data, error } = await supabase
                .from('inspection_sessions')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', sessionId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, { sessionId }) => {
            queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
        },
    });
}

// Soft delete an inspection session using SECURITY DEFINER function
export function useDeleteSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (sessionId: string) => {
            // Use SECURITY DEFINER function to bypass RLS issues
            // This also cascades soft-delete to responses, findings, and photos
            const { error } = await supabase
                .rpc('soft_delete_inspection_session', { p_session_id: sessionId });

            if (error) throw error;
            return sessionId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
        },
    });
}

import type { RecordInspectionInput } from './types';
