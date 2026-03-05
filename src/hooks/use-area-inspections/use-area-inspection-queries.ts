import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AreaTemplate, AreaInspectionResponse, AreaChecklistProgress } from './types';

/**
 * Fetch templates where template_type = 'area'
 */
export function useAreaTemplates() {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ['area-templates', profile?.tenant_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inspection_templates')
                .select(`
          id, tenant_id, code, name, name_ar, description,
          template_type, scope_description, estimated_duration_minutes, requires_photos, requires_gps,
          category_id, type_id, branch_id, site_id, version, is_active, created_by, created_at, updated_at,
          category:asset_categories(name, name_ar),
          type:asset_types(name, name_ar),
          branch:branches(name),
          site:sites(name)
        `)
                .eq('template_type', 'area')
                .eq('is_active', true)
                .is('deleted_at', null)
                .order('name');

            if (error) throw error;
            return data as unknown as AreaTemplate[];
        },
        enabled: !!profile?.tenant_id,
    });
}

/**
 * Fetch single area template with items
 */
export function useAreaTemplate(templateId: string | undefined) {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ['area-template', templateId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inspection_templates')
                .select(`
          id, tenant_id, code, name, name_ar, description,
          template_type, scope_description, estimated_duration_minutes, requires_photos, requires_gps,
          category_id, type_id, branch_id, site_id, version, is_active, created_by, created_at, updated_at,
          category:asset_categories(name, name_ar),
          type:asset_types(name, name_ar),
          branch:branches(name),
          site:sites(name)
        `)
                .eq('id', templateId!)
                .eq('template_type', 'area')
                .single();

            if (error) throw error;
            return data as unknown as AreaTemplate;
        },
        enabled: !!templateId && !!profile?.tenant_id,
    });
}

/**
 * Fetch all checklist responses for an area session
 */
export function useAreaInspectionResponses(sessionId: string | undefined) {
    return useQuery({
        queryKey: ['area-inspection-responses', sessionId],
        queryFn: async () => {
            if (!sessionId) return [];

            const { data, error } = await supabase
                .from('area_inspection_responses')
                .select(`
          id, tenant_id, session_id, template_item_id,
          response_value, result, notes, photo_paths,
          gps_lat, gps_lng, gps_accuracy,
          responded_by, responded_at, created_at, updated_at,
          template_item:inspection_template_items(
            id, question, question_ar, response_type, min_value, max_value,
            rating_scale, is_critical, is_required, instructions, instructions_ar, sort_order
          ),
          responder:profiles!area_inspection_responses_responded_by_fkey(full_name)
        `)
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Parse photo_paths from JSONB
            return (data || []).map(item => ({
                ...item,
                photo_paths: Array.isArray(item.photo_paths) ? item.photo_paths : [],
            })) as unknown as AreaInspectionResponse[];
        },
        enabled: !!sessionId,
    });
}

/**
 * Get pass/fail/pending stats for checklist items in an area session
 */
export function useAreaChecklistProgress(sessionId: string | undefined) {
    return useQuery({
        queryKey: ['area-checklist-progress', sessionId],
        queryFn: async (): Promise<AreaChecklistProgress | null> => {
            if (!sessionId) return null;

            // First get the session to find the template_id
            const { data: session, error: sessionError } = await supabase
                .from('inspection_sessions')
                .select('template_id')
                .eq('id', sessionId)
                .single();

            if (sessionError) throw sessionError;
            if (!session?.template_id) return null;

            // Count total items from template
            const { count: totalCount, error: itemsError } = await supabase
                .from('inspection_template_items')
                .select('id', { count: 'exact', head: true })
                .eq('template_id', session.template_id)
                .is('deleted_at', null);

            if (itemsError) throw itemsError;

            const total = totalCount || 0;

            // Get all responses for this session
            const { data: responses, error: responsesError } = await supabase
                .from('area_inspection_responses')
                .select('result')
                .eq('session_id', sessionId);

            if (responsesError) throw responsesError;

            // Calculate stats
            const responded = responses?.filter(r => r.result !== null).length || 0;
            const passed = responses?.filter(r => r.result === 'pass').length || 0;
            const failed = responses?.filter(r => r.result === 'fail').length || 0;
            const na = responses?.filter(r => r.result === 'na').length || 0;
            const percentage = total > 0 ? Math.round((responded / total) * 100) : 0;

            return {
                total,
                responded,
                passed,
                failed,
                na,
                percentage,
            };
        },
        enabled: !!sessionId,
        refetchInterval: 2000, // Poll every 2 seconds during active inspection
    });
}
