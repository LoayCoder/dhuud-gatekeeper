import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { CreateAuditSessionInput } from './types';

export function useCreateAuditSession() {
    const queryClient = useQueryClient();
    const { profile, user } = useAuth();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (input: CreateAuditSessionInput) => {
            if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('inspection_sessions')
                .insert({
                    template_id: input.template_id,
                    period: input.period,
                    site_id: input.site_id || null,
                    building_id: input.building_id || null,
                    floor_zone_id: input.floor_zone_id || null,
                    scope_notes: input.scope_notes || null,
                    attendees: input.audit_team || null,
                    tenant_id: profile.tenant_id,
                    inspector_id: input.lead_auditor_id || user.id,
                    session_type: 'audit',
                    status: 'draft',
                    total_assets: 0,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
            toast.success(t('audits.sessionCreated'));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

export function useStartAuditSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (sessionId: string) => {
            const { data, error } = await supabase
                .from('inspection_sessions')
                .update({
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
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

export function useSaveAuditResponse() {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (input: {
            session_id: string;
            template_item_id: string;
            result?: 'conforming' | 'non_conforming' | 'na';
            response_value?: string;
            notes?: string;
            objective_evidence?: string;
            nc_category?: 'minor' | 'major' | 'critical';
            photo_paths?: string[];
        }) => {
            if (!user?.id || !profile?.tenant_id) throw new Error('Not authenticated');

            // Map audit result to area response result
            const mappedResult = input.result === 'conforming' ? 'pass' : input.result === 'non_conforming' ? 'fail' : input.result === 'na' ? 'na' : null;

            // Check if response already exists
            const { data: existing } = await supabase
                .from('area_inspection_responses')
                .select('id')
                .eq('session_id', input.session_id)
                .eq('template_item_id', input.template_item_id)
                .maybeSingle();

            const responseData = {
                response_value: input.response_value || null,
                result: mappedResult,
                notes: input.notes || null,
                objective_evidence: input.objective_evidence || null,
                nc_category: input.result === 'non_conforming' ? (input.nc_category || null) : null,
                photo_paths: input.photo_paths || [],
                responded_by: user.id,
                responded_at: new Date().toISOString(),
            };

            let responseRecord;

            if (existing) {
                const { data, error } = await supabase
                    .from('area_inspection_responses')
                    .update(responseData)
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                responseRecord = data;
            } else {
                const { data, error } = await supabase
                    .from('area_inspection_responses')
                    .insert({
                        ...responseData,
                        session_id: input.session_id,
                        template_item_id: input.template_item_id,
                        tenant_id: profile.tenant_id,
                    })
                    .select()
                    .single();

                if (error) throw error;
                responseRecord = data;
            }

            // Auto-create finding on non-conforming result
            if (mappedResult === 'fail') {
                const { data: existingFinding } = await supabase
                    .from('area_inspection_findings')
                    .select('id')
                    .eq('response_id', responseRecord.id)
                    .is('deleted_at', null)
                    .maybeSingle();

                if (!existingFinding) {
                    await supabase
                        .from('area_inspection_findings')
                        .insert({
                            tenant_id: profile.tenant_id,
                            session_id: input.session_id,
                            response_id: responseRecord.id,
                            reference_id: '',
                            classification: input.nc_category === 'critical' ? 'critical_nc' : input.nc_category === 'major' ? 'major_nc' : 'minor_nc',
                            risk_level: input.nc_category === 'critical' ? 'critical' : input.nc_category === 'major' ? 'high' : 'medium',
                            status: 'open',
                            description: input.objective_evidence || input.notes || null,
                            created_by: user.id,
                        });
                }
            } else if (mappedResult === 'pass' || mappedResult === 'na') {
                // Close any existing finding
                await supabase
                    .from('area_inspection_findings')
                    .update({
                        status: 'closed',
                        closed_at: new Date().toISOString(),
                        closed_by: user.id,
                    })
                    .eq('response_id', responseRecord.id)
                    .eq('status', 'open')
                    .is('deleted_at', null);
            }

            return responseRecord;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['audit-responses', data.session_id] });
            queryClient.invalidateQueries({ queryKey: ['audit-progress', data.session_id] });
            queryClient.invalidateQueries({ queryKey: ['audit-nc-counts', data.session_id] });
            queryClient.invalidateQueries({ queryKey: ['area-findings', data.session_id] });
        },
    });
}

export function useCompleteAuditSession() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (sessionId: string) => {
            // Check if there are any non-conforming items
            const { count } = await supabase
                .from('area_inspection_responses')
                .select('id', { count: 'exact', head: true })
                .eq('session_id', sessionId)
                .eq('result', 'fail');

            const hasOpenActions = (count || 0) > 0;

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
            toast.success(t('audits.sessionCompleted'));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}
