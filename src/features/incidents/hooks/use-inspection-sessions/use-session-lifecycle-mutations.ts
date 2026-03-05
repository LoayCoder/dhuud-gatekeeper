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
                .single();

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
                .select('*')
                .eq('id', sessionId)
                .single();

            if (sessionError) throw sessionError;

            // Build asset query based on session filters
            let assetQuery = supabase
                .from('hsse_assets')
                .select('id')
                .eq('tenant_id', profile.tenant_id)
                .is('deleted_at', null);

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

            const { data: assets, error: assetsError } = await assetQuery;
            if (assetsError) throw assetsError;

            // Insert all assets into session_assets
            const assetCount = assets?.length || 0;
            if (assets && assetCount > 0) {
                const sessionAssets = assets.map(asset => ({
                    tenant_id: profile.tenant_id,
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
            const { data: failedCount } = await supabase
                .from('inspection_session_assets')
                .select('id', { count: 'exact', head: true })
                .eq('session_id', sessionId)
                .eq('quick_result', 'not_good');

            const hasOpenActions = (failedCount as unknown as { count?: number })?.count ? (failedCount as unknown as { count: number }).count > 0 : false;

            const { data, error } = await supabase
                .from('inspection_sessions')
                .update({
                    status: hasOpenActions ? 'completed_with_open_actions' : 'closed',
                    completed_at: new Date().toISOString(),
                    closed_at: hasOpenActions ? null : new Date().toISOString(),
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
                category_id: string | null;
                type_id: string | null;
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
