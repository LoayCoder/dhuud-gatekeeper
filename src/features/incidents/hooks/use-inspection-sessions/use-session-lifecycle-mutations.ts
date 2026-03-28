import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CreateSessionInput } from './types';

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

            // Get session details to know filters
            const { data: session, error: sessionError } = await supabase
                .from('inspection_sessions')
                .select('id, tenant_id, branch_id, site_id, building_id, floor_zone_id, category_id, type_id, subtype_id')
                .eq('id', sessionId)
                .single();

            if (sessionError) throw sessionError;

            // Build asset query based on session filters (full hierarchy)
            let assetQuery = supabase
                .from('hsse_assets')
                .select('id')
                .eq('tenant_id', profile.tenant_id)
                .is('deleted_at', null);

            if (session.branch_id) {
                assetQuery = assetQuery.eq('branch_id', session.branch_id);
            }
            if (session.site_id) {
                assetQuery = assetQuery.eq('site_id', session.site_id);
            }
            if (session.building_id) {
                assetQuery = assetQuery.eq('building_id', session.building_id);
            }
            if (session.floor_zone_id) {
                assetQuery = assetQuery.eq('floor_zone_id', session.floor_zone_id);
            }
            if (session.category_id) {
                assetQuery = assetQuery.eq('category_id', session.category_id);
            }
            if (session.type_id) {
                assetQuery = assetQuery.eq('type_id', session.type_id);
            }
            if (session.subtype_id) {
                assetQuery = assetQuery.eq('subtype_id', session.subtype_id);
            }

            const { data: assets, error: assetsError } = await assetQuery;
            if (assetsError) throw assetsError;

            // Guard: zero assets means dead-end session
            const assetCount = assets?.length || 0;
            if (assetCount === 0) {
                throw new Error('No assets match the session scope. Add assets or adjust filters.');
            }

            if (assets && assetCount > 0) {
                const sessionAssets = assets.map(asset => ({
                    tenant_id: profile.tenant_id,
                    branch_id: session.branch_id || null,
                    session_id: sessionId,
                    asset_id: asset.id,
                }));

                const { error: insertError } = await supabase
                    .from('inspection_session_assets')
                    .insert(sessionAssets);

                if (insertError) throw insertError;
            }

            // Update session status to in_progress and set total_assets count
            const { data, error } = await supabase
                .from('inspection_sessions')
                .update({
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
                    total_assets: assetCount,
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
        onSuccess: (data) => {
            // Get session_id from the returned data to invalidate correct queries
            queryClient.invalidateQueries({ queryKey: ['session-assets', data.session_id] });
            queryClient.invalidateQueries({ queryKey: ['session-assets-uninspected', data.session_id] });
            queryClient.invalidateQueries({ queryKey: ['inspection-session', data.session_id] });
            queryClient.invalidateQueries({ queryKey: ['session-progress', data.session_id] });
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
            const { data: failedCount } = await supabase
                .from('inspection_session_assets')
                .select('id', { count: 'exact', head: true })
                .eq('session_id', sessionId)
                .in('quick_result', ['not_good', 'partial']);

            const hasOpenActions = (failedCount as unknown as { count?: number })?.count ? (failedCount as unknown as { count: number }).count > 0 : false;

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
