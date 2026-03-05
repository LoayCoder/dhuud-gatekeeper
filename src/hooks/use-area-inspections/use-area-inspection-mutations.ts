import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../use-network-status';
import { offlineDataCache, CACHE_STORES } from '@/lib/offline-data-cache';
import { registerAreaInspectionSync } from '@/lib/area-inspection-sync';
import type { CreateAreaSessionInput, SaveAreaResponseInput } from './types';

/**
 * Create new area inspection session with extended fields
 */
export function useCreateAreaSession() {
    const queryClient = useQueryClient();
    const { profile, user } = useAuth();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (input: CreateAreaSessionInput) => {
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
                    weather_conditions: input.weather_conditions || null,
                    attendees: input.attendees || null,
                    gps_boundary: input.gps_boundary || null,
                    tenant_id: profile.tenant_id,
                    inspector_id: user.id,
                    session_type: 'area',
                    status: 'draft',
                    total_assets: 0, // Area sessions don't have assets
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
            toast.success(t('inspections.sessionCreated'));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/**
 * Start area session (update status to in_progress)
 * Unlike asset sessions, area sessions don't populate assets
 */
export function useStartAreaSession() {
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

/**
 * Save/update individual checklist response with photos & GPS (upsert)
 */
export function useSaveAreaResponse() {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();
    const { isOnline } = useNetworkStatus();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (input: SaveAreaResponseInput) => {
            if (!user?.id || !profile?.tenant_id) throw new Error('Not authenticated');

            // If offline, save to IndexedDB cache
            if (!isOnline) {
                const responseId = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                const offlineResponse = {
                    id: responseId,
                    tenant_id: profile.tenant_id,
                    session_id: input.session_id,
                    template_item_id: input.template_item_id,
                    result: input.result,
                    response_value: input.response_value,
                    notes: input.notes,
                    photo_paths: input.photo_paths || [],
                    gps_lat: input.gps_lat,
                    gps_lng: input.gps_lng,
                    gps_accuracy: input.gps_accuracy,
                    responded_by: user.id,
                    responded_at: new Date().toISOString(),
                    _offline: true,
                    _syncStatus: 'pending' as const,
                };

                interface CachedResponse {
                    id: string;
                    template_item_id: string;
                    [key: string]: unknown;
                }

                // Get existing cached responses
                const cached = await offlineDataCache.get<CachedResponse[]>(
                    CACHE_STORES.AREA_RESPONSES,
                    `responses_${input.session_id}`
                );

                const existingResponses = cached.data || [];
                const existingIndex = existingResponses.findIndex(
                    (r: CachedResponse) => r.template_item_id === input.template_item_id
                );

                let updatedResponses;
                if (existingIndex >= 0) {
                    updatedResponses = [...existingResponses];
                    updatedResponses[existingIndex] = {
                        ...updatedResponses[existingIndex],
                        ...offlineResponse,
                        id: existingResponses[existingIndex].id,
                    };
                } else {
                    updatedResponses = [...existingResponses, offlineResponse];
                }

                await offlineDataCache.set(
                    CACHE_STORES.AREA_RESPONSES,
                    `responses_${input.session_id}`,
                    updatedResponses,
                    { maxAge: 7 * 24 * 60 * 60 * 1000 }
                );

                // Auto-create offline finding for FAIL
                if (input.result === 'fail') {
                    const findingId = `offline_finding_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    const finding = {
                        id: findingId,
                        tenant_id: profile.tenant_id,
                        session_id: input.session_id,
                        response_id: offlineResponse.id,
                        reference_id: '',
                        classification: 'observation',
                        risk_level: 'medium',
                        status: 'open',
                        created_by: user.id,
                        created_at: new Date().toISOString(),
                        _offline: true,
                        _syncStatus: 'pending',
                    };

                    const cachedFindings = await offlineDataCache.get<Record<string, unknown>[]>(
                        CACHE_STORES.AREA_FINDINGS,
                        `findings_${input.session_id}`
                    );
                    const existingFindings = cachedFindings.data || [];
                    await offlineDataCache.set(
                        CACHE_STORES.AREA_FINDINGS,
                        `findings_${input.session_id}`,
                        [...existingFindings, finding],
                        { maxAge: 7 * 24 * 60 * 60 * 1000 }
                    );
                }

                // Register background sync
                registerAreaInspectionSync();

                return offlineResponse;
            }

            // Online path - original logic
            const { data: existing } = await supabase
                .from('area_inspection_responses')
                .select('id')
                .eq('session_id', input.session_id)
                .eq('template_item_id', input.template_item_id)
                .maybeSingle();

            const responseData = {
                response_value: input.response_value || null,
                result: input.result || null,
                notes: input.notes || null,
                photo_paths: input.photo_paths || [],
                gps_lat: input.gps_lat || null,
                gps_lng: input.gps_lng || null,
                gps_accuracy: input.gps_accuracy || null,
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

            // Auto-create finding on FAIL result
            if (input.result === 'fail') {
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
                            classification: 'observation',
                            risk_level: 'medium',
                            status: 'open',
                            created_by: user.id,
                        });
                }
            } else if (input.result === 'pass' || input.result === 'na') {
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
        onSuccess: (data, variables) => {
            const sessionId = data?.session_id || variables.session_id;
            queryClient.invalidateQueries({ queryKey: ['area-inspection-responses', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['area-checklist-progress', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['area-findings', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['area-findings-count', sessionId] });
        },
    });
}

/**
 * Complete area inspection session
 */
export function useCompleteAreaSession() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (sessionId: string) => {
            // Check if there are any failed items
            const { count: failedResponsesCount } = await supabase
                .from('area_inspection_responses')
                .select('id', { count: 'exact', head: true })
                .eq('session_id', sessionId)
                .eq('result', 'fail');

            const hasOpenActions = (failedResponsesCount || 0) > 0;

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
            toast.success(t('inspections.sessionCompleted'));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/**
 * Update area session metadata (scope_notes, weather, attendees)
 */
export function useUpdateAreaSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            sessionId,
            ...updates
        }: {
            sessionId: string;
            scope_notes?: string | null;
            weather_conditions?: string | null;
            attendees?: { name: string; role?: string }[] | null;
            gps_boundary?: { lat: number; lng: number }[] | null;
        }) => {
            const { data, error } = await supabase
                .from('inspection_sessions')
                .update(updates)
                .eq('id', sessionId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['inspection-session', data.id] });
        },
    });
}