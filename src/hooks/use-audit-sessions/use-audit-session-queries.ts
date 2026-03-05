import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AuditTemplate, AuditTemplateItem, AuditResponse, AuditProgress, NCCounts } from './types';

export function useAuditTemplates() {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ['audit-templates', profile?.tenant_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inspection_templates')
                .select(`
          id, tenant_id, code, name, name_ar, description,
          template_type, scope_description, estimated_duration_minutes, requires_photos, requires_gps,
          standard_reference, passing_score_percentage,
          version, is_active, created_at
        `)
                .eq('template_type', 'audit')
                .eq('is_active', true)
                .is('deleted_at', null)
                .order('name');

            if (error) throw error;
            return data as AuditTemplate[];
        },
        enabled: !!profile?.tenant_id,
    });
}

export function useAuditTemplate(templateId: string | undefined) {
    return useQuery({
        queryKey: ['audit-template', templateId],
        queryFn: async () => {
            if (!templateId) return null;

            const { data, error } = await supabase
                .from('inspection_templates')
                .select(`
          id, tenant_id, code, name, name_ar, description,
          template_type, scope_description, estimated_duration_minutes, requires_photos, requires_gps,
          standard_reference, passing_score_percentage,
          version, is_active, created_at
        `)
                .eq('id', templateId)
                .single();

            if (error) throw error;
            return data as AuditTemplate;
        },
        enabled: !!templateId,
    });
}

export function useAuditTemplateItems(templateId: string | undefined) {
    return useQuery({
        queryKey: ['audit-template-items', templateId],
        queryFn: async () => {
            if (!templateId) return [] as AuditTemplateItem[];

            // Use type assertion to break deep type instantiation chain
            const query = supabase.from('inspection_template_items') as any;
            const { data, error } = await query
                .select('id, template_id, question, question_ar, response_type, clause_reference, scoring_weight, nc_category, is_critical, is_required, instructions, instructions_ar, sort_order')
                .eq('template_id', templateId)
                .is('deleted_at', null)
                .eq('is_active', true)
                .order('sort_order');

            if (error) throw error;

            return ((data || []) as AuditTemplateItem[]);
        },
        enabled: !!templateId,
    });
}

export function useAuditResponses(sessionId: string | undefined) {
    return useQuery({
        queryKey: ['audit-responses', sessionId],
        queryFn: async () => {
            if (!sessionId) return [];

            const { data, error } = await supabase
                .from('area_inspection_responses')
                .select(`
          id, session_id, template_item_id,
          response_value, result, notes, photo_paths,
          gps_lat, gps_lng, responded_at,
          nc_category, objective_evidence
        `)
                .eq('session_id', sessionId)
                .order('created_at');

            if (error) throw error;

            // Map result to audit-specific fields
            return (data || []).map(item => ({
                id: item.id,
                session_id: item.session_id,
                template_item_id: item.template_item_id,
                result: item.result === 'pass' ? 'conforming' : item.result === 'fail' ? 'non_conforming' : item.result === 'na' ? 'na' : null,
                response_value: item.response_value,
                notes: item.notes,
                objective_evidence: (item as any).objective_evidence || null,
                nc_category: (item as any).nc_category || null,
                photo_paths: Array.isArray(item.photo_paths) ? item.photo_paths : [],
                responded_at: item.responded_at,
            })) as AuditResponse[];
        },
        enabled: !!sessionId,
    });
}

export function useAuditProgress(sessionId: string | undefined, templateId: string | undefined) {
    const { data: template } = useAuditTemplate(templateId);
    const { data: items = [] } = useAuditTemplateItems(templateId);
    const { data: responses = [] } = useAuditResponses(sessionId);

    return useQuery({
        queryKey: ['audit-progress', sessionId, templateId],
        queryFn: async (): Promise<AuditProgress | null> => {
            if (!sessionId || !templateId) return null;

            const responseMap = new Map(responses.map(r => [r.template_item_id, r]));

            let weightedScore = 0;
            let maxScore = 0;
            let conforming = 0;
            let nonConforming = 0;
            let na = 0;
            let responded = 0;
            let hasCriticalNC = false;

            for (const item of items) {
                const response = responseMap.get(item.id);
                const weight = item.scoring_weight || 1;

                if (response?.result) {
                    responded++;

                    if (response.result === 'conforming') {
                        conforming++;
                        weightedScore += weight;
                        maxScore += weight;
                    } else if (response.result === 'non_conforming') {
                        nonConforming++;
                        maxScore += weight;
                        // Check for critical NC
                        if (item.nc_category === 'critical' || item.is_critical) {
                            hasCriticalNC = true;
                        }
                    } else if (response.result === 'na') {
                        na++;
                        // N/A items don't count toward score
                    }
                } else {
                    maxScore += weight;
                }
            }

            const percentage = maxScore > 0 ? (weightedScore / maxScore) * 100 : 0;
            const passingThreshold = template?.passing_score_percentage || 80;

            return {
                total: items.length,
                responded,
                conforming,
                nonConforming,
                na,
                weightedScore,
                maxScore,
                percentage,
                passingThreshold,
                isPassing: percentage >= passingThreshold && !hasCriticalNC,
                hasBlockingNC: hasCriticalNC,
            };
        },
        enabled: !!sessionId && !!templateId && items.length > 0,
        refetchInterval: 2000,
    });
}

export function useNCCounts(sessionId: string | undefined, templateId: string | undefined) {
    const { data: items = [] } = useAuditTemplateItems(templateId);
    const { data: responses = [] } = useAuditResponses(sessionId);

    return useQuery({
        queryKey: ['audit-nc-counts', sessionId, templateId],
        queryFn: async (): Promise<NCCounts> => {
            const responseMap = new Map(responses.map(r => [r.template_item_id, r]));

            let minor = 0;
            let major = 0;
            let critical = 0;

            for (const item of items) {
                const response = responseMap.get(item.id);

                if (response?.result === 'non_conforming') {
                    // Use response nc_category if available, otherwise fall back to item defaults
                    const category = response.nc_category || item.nc_category || (item.is_critical ? 'critical' : 'minor');
                    if (category === 'critical') critical++;
                    else if (category === 'major') major++;
                    else minor++;
                }
            }

            return {
                minor,
                major,
                critical,
                total: minor + major + critical,
            };
        },
        enabled: !!sessionId && !!templateId && items.length > 0,
    });
}
