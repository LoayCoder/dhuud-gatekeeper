import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { InspectionSession, SessionAsset, InspectionFinding } from './types';

// Hook: Get all inspection sessions with filters
export function useInspectionSessions(filters?: {
    status?: string;
    site_id?: string;
    inspector_id?: string;
}) {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ['inspection-sessions', filters],
        queryFn: async () => {
            let query = supabase
                .from('inspection_sessions')
                .select(`
          *,
          template:inspection_templates(name, name_ar),
          site:sites(name),
          category:asset_categories(name, name_ar),
          type:asset_types(name, name_ar),
          inspector:profiles!inspection_sessions_inspector_id_fkey(full_name)
        `)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }
            if (filters?.site_id) {
                query = query.eq('site_id', filters.site_id);
            }
            if (filters?.inspector_id) {
                query = query.eq('inspector_id', filters.inspector_id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as InspectionSession[];
        },
        enabled: !!profile?.tenant_id,
    });
}

// Hook: Get single session with details
export function useInspectionSession(sessionId: string | undefined) {
    return useQuery({
        queryKey: ['inspection-session', sessionId],
        queryFn: async () => {
            if (!sessionId) return null;

            const { data, error } = await supabase
                .from('inspection_sessions')
                .select(`
          *,
          template:inspection_templates(name, name_ar),
          site:sites(name),
          category:asset_categories(name, name_ar),
          type:asset_types(name, name_ar),
          inspector:profiles!inspection_sessions_inspector_id_fkey(full_name)
        `)
                .eq('id', sessionId)
                .is('deleted_at', null)
                .single();

            if (error) throw error;
            return data as InspectionSession;
        },
        enabled: !!sessionId,
    });
}

// Hook: Get all assets in session
export function useSessionAssets(sessionId: string | undefined) {
    return useQuery({
        queryKey: ['session-assets', sessionId],
        queryFn: async () => {
            if (!sessionId) return [];

            const { data, error } = await supabase
                .from('inspection_session_assets')
                .select(`
          *,
          asset:hsse_assets(
            id, name, asset_code, serial_number, status, last_inspection_date, subtype_id,
            category:asset_categories(name, name_ar),
            type:asset_types(id, name, name_ar),
            building:buildings(name),
            floor_zone:floors_zones(name)
          )
        `)
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as SessionAsset[];
        },
        enabled: !!sessionId,
    });
}

// Hook: Get uninspected assets in session
export function useUninspectedAssets(sessionId: string | undefined) {
    return useQuery({
        queryKey: ['session-assets-uninspected', sessionId],
        queryFn: async () => {
            if (!sessionId) return [];

            const { data, error } = await supabase
                .from('inspection_session_assets')
                .select(`
          *,
          asset:hsse_assets(
            id, name, asset_code, serial_number, status, last_inspection_date, subtype_id,
            category:asset_categories(name, name_ar),
            type:asset_types(id, name, name_ar),
            building:buildings(name),
            floor_zone:floors_zones(name)
          )
        `)
                .eq('session_id', sessionId)
                .is('quick_result', null)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as SessionAsset[];
        },
        enabled: !!sessionId,
    });
}

// Hook: Get session asset by asset_id (for QR scan lookup)
export function useSessionAssetByAssetId(sessionId: string | undefined, assetId: string | undefined) {
    return useQuery({
        queryKey: ['session-asset-lookup', sessionId, assetId],
        queryFn: async () => {
            if (!sessionId || !assetId) return null;

            const { data, error } = await supabase
                .from('inspection_session_assets')
                .select(`
          *,
          asset:hsse_assets(
            id, name, asset_code, serial_number, status, last_inspection_date, subtype_id,
            category:asset_categories(name, name_ar),
            type:asset_types(id, name, name_ar),
            building:buildings(name),
            floor_zone:floors_zones(name)
          )
        `)
                .eq('session_id', sessionId)
                .eq('asset_id', assetId)
                .maybeSingle();

            if (error) throw error;
            return data as SessionAsset | null;
        },
        enabled: !!sessionId && !!assetId,
    });
}

// Hook: Get session progress stats
export function useSessionProgress(sessionId: string | undefined) {
    return useQuery({
        queryKey: ['session-progress', sessionId],
        queryFn: async () => {
            if (!sessionId) return null;

            const { data, error } = await supabase
                .from('inspection_sessions')
                .select('total_assets, inspected_count, passed_count, failed_count, not_accessible_count, compliance_percentage')
                .eq('id', sessionId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!sessionId,
        refetchInterval: 2000, // Poll every 2 seconds during active inspection
    });
}

// Hook: Get session findings
export function useSessionFindings(sessionId: string | undefined) {
    return useQuery({
        queryKey: ['session-findings', sessionId],
        queryFn: async () => {
            if (!sessionId) return [];

            const { data, error } = await supabase
                .from('inspection_findings')
                .select(`
          *,
          asset:hsse_assets(name, asset_code)
        `)
                .eq('session_id', sessionId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as InspectionFinding[];
        },
        enabled: !!sessionId,
    });
}
