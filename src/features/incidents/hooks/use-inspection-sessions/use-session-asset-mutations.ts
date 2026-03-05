import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { InspectionFinding } from './types';

// Hook: Create finding
export function useCreateFinding() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();

    return useMutation({
        mutationFn: async (input: {
            session_id: string;
            session_asset_id?: string;
            asset_id?: string;
            classification: 'minor_nc' | 'major_nc' | 'critical_nc' | 'observation' | 'ofi';
            risk_level: 'low' | 'medium' | 'high' | 'critical';
            description: string;
            ai_generated_description?: string;
        }) => {
            if (!profile?.tenant_id) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('inspection_findings')
                .insert({
                    ...input,
                    tenant_id: profile.tenant_id,
                    status: 'open',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['session-findings', data.session_id] });
        },
    });
}

// Hook: Update finding
export function useUpdateFinding() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & Partial<InspectionFinding>) => {
            const { data, error } = await supabase
                .from('inspection_findings')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['session-findings', data.session_id] });
        },
    });
}

// Hook: Add an asset to an in-progress session via QR scan
export function useAddAssetToSession() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();

    return useMutation({
        mutationFn: async ({ sessionId, assetId }: { sessionId: string; assetId: string }) => {
            if (!profile?.tenant_id) throw new Error('Not authenticated');

            // Get session details to verify asset matches filters
            const { data: session, error: sessionError } = await supabase
                .from('inspection_sessions')
                .select('site_id, building_id, floor_zone_id, category_id, type_id')
                .eq('id', sessionId)
                .single();

            if (sessionError) throw sessionError;

            // Get asset details
            const { data: asset, error: assetError } = await supabase
                .from('hsse_assets')
                .select('id, site_id, building_id, floor_zone_id, category_id, type_id')
                .eq('id', assetId)
                .eq('tenant_id', profile.tenant_id)
                .is('deleted_at', null)
                .single();

            if (assetError) throw new Error('Asset not found');

            // Verify asset matches session filters
            if (session.site_id && asset.site_id !== session.site_id) {
                throw new Error('Asset does not match session site filter');
            }
            if (session.building_id && asset.building_id !== session.building_id) {
                throw new Error('Asset does not match session building filter');
            }
            if (session.category_id && asset.category_id !== session.category_id) {
                throw new Error('Asset does not match session category filter');
            }
            if (session.type_id && asset.type_id !== session.type_id) {
                throw new Error('Asset does not match session type filter');
            }

            // Check if already in session
            const { data: existing } = await supabase
                .from('inspection_session_assets')
                .select('id')
                .eq('session_id', sessionId)
                .eq('asset_id', assetId)
                .maybeSingle();

            if (existing) {
                throw new Error('Asset already in session');
            }

            // Insert asset into session
            const { data, error } = await supabase
                .from('inspection_session_assets')
                .insert({
                    tenant_id: profile.tenant_id,
                    session_id: sessionId,
                    asset_id: assetId,
                })
                .select()
                .single();

            if (error) throw error;

            // Update total_assets count
            const { data: currentSession } = await supabase
                .from('inspection_sessions')
                .select('total_assets')
                .eq('id', sessionId)
                .single();

            await supabase
                .from('inspection_sessions')
                .update({ total_assets: (currentSession?.total_assets || 0) + 1 })
                .eq('id', sessionId);

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['session-assets', data.session_id] });
            queryClient.invalidateQueries({ queryKey: ['session-assets-uninspected', data.session_id] });
            queryClient.invalidateQueries({ queryKey: ['inspection-session', data.session_id] });
            queryClient.invalidateQueries({ queryKey: ['session-progress', data.session_id] });
        },
    });
}

// Hook: Refresh session assets (find new matching assets)
export function useRefreshSessionAssets() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();

    return useMutation({
        mutationFn: async (sessionId: string) => {
            if (!profile?.tenant_id) throw new Error('Not authenticated');

            // Get session details
            const { data: session, error: sessionError } = await supabase
                .from('inspection_sessions')
                .select('site_id, building_id, floor_zone_id, category_id, type_id')
                .eq('id', sessionId)
                .single();

            if (sessionError) throw sessionError;

            // Build asset query based on session filters
            let assetQuery = supabase
                .from('hsse_assets')
                .select('id')
                .eq('tenant_id', profile.tenant_id)
                .is('deleted_at', null);

            if (session.site_id) assetQuery = assetQuery.eq('site_id', session.site_id);
            if (session.building_id) assetQuery = assetQuery.eq('building_id', session.building_id);
            if (session.floor_zone_id) assetQuery = assetQuery.eq('floor_zone_id', session.floor_zone_id);
            if (session.category_id) assetQuery = assetQuery.eq('category_id', session.category_id);
            if (session.type_id) assetQuery = assetQuery.eq('type_id', session.type_id);

            const { data: allMatchingAssets, error: assetsError } = await assetQuery;
            if (assetsError) throw assetsError;

            // Get existing session assets
            const { data: existingAssets } = await supabase
                .from('inspection_session_assets')
                .select('asset_id')
                .eq('session_id', sessionId);

            const existingAssetIds = new Set(existingAssets?.map(a => a.asset_id) || []);
            const newAssets = allMatchingAssets?.filter(a => !existingAssetIds.has(a.id)) || [];

            if (newAssets.length === 0) {
                return { added: 0, sessionId };
            }

            // Insert new assets
            const sessionAssets = newAssets.map(asset => ({
                tenant_id: profile.tenant_id,
                session_id: sessionId,
                asset_id: asset.id,
            }));

            const { error: insertError } = await supabase
                .from('inspection_session_assets')
                .insert(sessionAssets);

            if (insertError) throw insertError;

            // Update total_assets count
            const newTotal = (existingAssets?.length || 0) + newAssets.length;
            await supabase
                .from('inspection_sessions')
                .update({ total_assets: newTotal })
                .eq('id', sessionId);

            return { added: newAssets.length, sessionId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['session-assets', data.sessionId] });
            queryClient.invalidateQueries({ queryKey: ['session-assets-uninspected', data.sessionId] });
            queryClient.invalidateQueries({ queryKey: ['inspection-session', data.sessionId] });
            queryClient.invalidateQueries({ queryKey: ['session-progress', data.sessionId] });
        },
    });
}
