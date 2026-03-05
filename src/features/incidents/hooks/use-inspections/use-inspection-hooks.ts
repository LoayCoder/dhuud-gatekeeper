import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { AssetInspection, InspectionResponse } from './types';

// ============= Inspection Hooks =============

export function useAssetInspections(assetId: string | undefined) {
    return useQuery({
        queryKey: ['asset-inspections', assetId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('asset_inspections')
                .select(`
          id, tenant_id, asset_id, template_id, reference_id, status,
          inspection_date, inspector_id, overall_result, summary_notes,
          linked_incident_id, completed_at, created_at, updated_at,
          template:inspection_templates(name, name_ar),
          inspector:profiles(full_name)
        `)
                .eq('asset_id', assetId!)
                .is('deleted_at', null)
                .order('inspection_date', { ascending: false });

            if (error) throw error;
            return data as unknown as AssetInspection[];
        },
        enabled: !!assetId,
    });
}

export function useInspection(inspectionId: string | undefined) {
    return useQuery({
        queryKey: ['inspection', inspectionId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('asset_inspections')
                .select(`
          id, tenant_id, asset_id, template_id, reference_id, status,
          inspection_date, inspector_id, overall_result, summary_notes,
          linked_incident_id, completed_at, created_at, updated_at,
          template:inspection_templates(id, name, name_ar, code),
          inspector:profiles(full_name),
          asset:hsse_assets(name, asset_code)
        `)
                .eq('id', inspectionId!)
                .single();

            if (error) throw error;
            return data as unknown as AssetInspection;
        },
        enabled: !!inspectionId,
    });
}

export function useInspectionResponses(inspectionId: string | undefined) {
    return useQuery({
        queryKey: ['inspection-responses', inspectionId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inspection_responses')
                .select(`
          id, inspection_id, template_item_id, tenant_id,
          response_value, result, notes, photo_path, responded_at,
          template_item:inspection_template_items(
            id, question, question_ar, response_type, min_value, max_value,
            rating_scale, is_critical, is_required, instructions, instructions_ar, sort_order
          )
        `)
                .eq('inspection_id', inspectionId!)
                .order('responded_at');

            if (error) throw error;
            return data as unknown as InspectionResponse[];
        },
        enabled: !!inspectionId,
    });
}

export function useStartInspection() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (data: {
            asset_id: string;
            template_id: string;
            inspection_date?: string;
        }) => {
            // Fetch tenant_id at mutation time to avoid race condition
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('user_id', user.id)
                .single();

            if (!profile?.tenant_id) throw new Error('No tenant found');

            const { data: result, error } = await supabase
                .from('asset_inspections')
                .insert({
                    ...data,
                    tenant_id: profile.tenant_id,
                    inspector_id: user.id,
                    inspection_date: data.inspection_date || new Date().toISOString().split('T')[0],
                })
                .select()
                .single();

            if (error) throw error;
            return result;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['asset-inspections', data.asset_id] });
            toast.success(t('inspections.inspectionStarted'));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

export function useSaveInspectionResponse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            inspection_id: string;
            template_item_id: string;
            response_value?: string;
            result?: 'pass' | 'fail' | 'na';
            notes?: string;
            photo_path?: string;
        }) => {
            // Upsert - update if exists, insert if not
            const { data: existing } = await supabase
                .from('inspection_responses')
                .select('id')
                .eq('inspection_id', data.inspection_id)
                .eq('template_item_id', data.template_item_id)
                .maybeSingle();

            if (existing) {
                const { data: result, error } = await supabase
                    .from('inspection_responses')
                    .update({
                        response_value: data.response_value,
                        result: data.result,
                        notes: data.notes,
                        photo_path: data.photo_path,
                        responded_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                return result;
            } else {
                // Fetch tenant_id at mutation time to avoid race condition
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Not authenticated');

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tenant_id')
                    .eq('user_id', user.id)
                    .single();

                if (!profile?.tenant_id) throw new Error('No tenant found');

                const { data: result, error } = await supabase
                    .from('inspection_responses')
                    .insert({
                        ...data,
                        tenant_id: profile.tenant_id,
                    })
                    .select()
                    .single();

                if (error) throw error;
                return result;
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inspection-responses', variables.inspection_id] });
        },
    });
}

export function useCompleteInspection() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({ id, overall_result, summary_notes }: {
            id: string;
            overall_result: 'pass' | 'fail' | 'partial';
            summary_notes?: string;
        }) => {
            const { data: result, error } = await supabase
                .from('asset_inspections')
                .update({
                    status: 'completed',
                    overall_result,
                    summary_notes,
                    completed_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select('*, asset:hsse_assets(id)')
                .single();

            if (error) throw error;
            return result;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['inspection', data.id] });
            queryClient.invalidateQueries({ queryKey: ['asset-inspections'] });
            queryClient.invalidateQueries({ queryKey: ['asset', (data as any).asset?.id] });
            queryClient.invalidateQueries({ queryKey: ['overdue-inspections'] });
            toast.success(t('inspections.inspectionCompleted'));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

export function useCancelInspection() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (id: string) => {
            const { data: result, error } = await supabase
                .from('asset_inspections')
                .update({ status: 'cancelled' })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return result;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['inspection', data.id] });
            queryClient.invalidateQueries({ queryKey: ['asset-inspections', data.asset_id] });
            toast.success(t('inspections.inspectionCancelled'));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

// ============= Dashboard Hooks =============

export function useRecentInspections(limit: number = 5) {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ['recent-inspections', profile?.tenant_id, limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('asset_inspections')
                .select(`
          id, reference_id, status, inspection_date, overall_result, completed_at,
          asset:hsse_assets(name, asset_code),
          inspector:profiles(full_name)
        `)
                .eq('status', 'completed')
                .is('deleted_at', null)
                .order('completed_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data as unknown as AssetInspection[];
        },
        enabled: !!profile?.tenant_id,
    });
}

export function useInspectionStats() {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ['inspection-stats', profile?.tenant_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('asset_inspections')
                .select('overall_result')
                .eq('status', 'completed')
                .is('deleted_at', null);

            if (error) throw error;

            const total = data.length;
            const passed = data.filter(i => i.overall_result === 'pass').length;
            const failed = data.filter(i => i.overall_result === 'fail').length;
            const partial = data.filter(i => i.overall_result === 'partial').length;

            return {
                total,
                passed,
                failed,
                partial,
                complianceRate: total > 0 ? Math.round((passed / total) * 100) : 0,
            };
        },
        enabled: !!profile?.tenant_id,
    });
}
