/**
 * Offline Area Inspection Hooks
 * Provides caching and offline-first data access for area inspections
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from './use-network-status';
import { offlineDataCache, CACHE_STORES } from '@/lib/offline-data-cache';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { AreaInspectionResponse, SaveAreaResponseInput } from './use-area-inspections';

// Types for offline data
export interface OfflineAreaSession {
  id: string;
  template_id: string;
  period: string;
  status: string;
  site_id?: string | null;
  building_id?: string | null;
  floor_zone_id?: string | null;
  scope_notes?: string | null;
  weather_conditions?: string | null;
  attendees?: { name: string; role?: string }[] | null;
  gps_boundary?: { lat: number; lng: number }[] | null;
  started_at?: string | null;
  completed_at?: string | null;
  inspector_id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  // Template data
  template?: {
    id: string;
    name: string;
    name_ar: string | null;
    requires_photos: boolean;
    requires_gps: boolean;
  };
}

export interface OfflineTemplateItem {
  id: string;
  template_id: string;
  question: string;
  question_ar: string | null;
  response_type: string;
  is_critical: boolean;
  is_required: boolean;
  sort_order: number;
  instructions?: string | null;
  instructions_ar?: string | null;
}

export interface OfflineAreaResponse extends Omit<SaveAreaResponseInput, 'photo_paths'> {
  id: string;
  tenant_id: string;
  responded_by: string;
  responded_at: string;
  photo_paths: string[];
  _offline?: boolean;
  _syncStatus?: 'pending' | 'synced' | 'failed';
}

export interface OfflineAreaFinding {
  id: string;
  tenant_id: string;
  session_id: string;
  response_id: string;
  reference_id: string;
  classification: string;
  risk_level: string;
  status: string;
  description?: string | null;
  recommendation?: string | null;
  due_date?: string | null;
  created_by: string;
  created_at: string;
  _offline?: boolean;
  _syncStatus?: 'pending' | 'synced' | 'failed';
}

const CACHE_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for offline inspections
};

/**
 * Hook to prefetch and cache an area session with its template items
 */
export function usePrefetchAreaSession() {
  const { profile } = useAuth();
  const { t } = useTranslation();

  const prefetch = useCallback(async (sessionId: string) => {
    if (!profile?.tenant_id) return;

    try {
      // Fetch session with template
      const { data: session, error: sessionError } = await supabase
        .from('inspection_sessions')
        .select(`
          id, template_id, period, status, site_id, building_id, floor_zone_id,
          scope_notes, weather_conditions, attendees, gps_boundary,
          started_at, completed_at, inspector_id, tenant_id, created_at, updated_at,
          template:inspection_templates(id, name, name_ar, requires_photos, requires_gps)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Cache session
      await offlineDataCache.set(
        CACHE_STORES.AREA_SESSIONS,
        `session_${sessionId}`,
        session,
        CACHE_CONFIG
      );

      // Fetch and cache template items
      if (session?.template_id) {
        const { data: items, error: itemsError } = await supabase
          .from('inspection_template_items')
          .select('id, template_id, question, question_ar, response_type, is_critical, is_required, sort_order, instructions, instructions_ar')
          .eq('template_id', session.template_id)
          .is('deleted_at', null)
          .order('sort_order');

        if (!itemsError && items) {
          await offlineDataCache.set(
            CACHE_STORES.TEMPLATE_ITEMS,
            `template_${session.template_id}`,
            items,
            CACHE_CONFIG
          );
        }
      }

      // Fetch and cache existing responses
      const { data: responses, error: responsesError } = await supabase
        .from('area_inspection_responses')
        .select('*')
        .eq('session_id', sessionId);

      if (!responsesError && responses) {
        await offlineDataCache.set(
          CACHE_STORES.AREA_RESPONSES,
          `responses_${sessionId}`,
          responses,
          CACHE_CONFIG
        );
      }

      toast.success(t('offline.sessionCached', 'Session cached for offline use'));
      return session;
    } catch (error) {
      console.error('Failed to prefetch area session:', error);
      toast.error(t('offline.cacheFailed', 'Failed to cache session'));
    }
  }, [profile?.tenant_id, t]);

  return { prefetch };
}

/**
 * Hook to get cached area session data (offline-first)
 */
export function useOfflineAreaSession(sessionId: string | undefined) {
  const { isOnline } = useNetworkStatus();
  const [session, setSession] = useState<OfflineAreaSession | null>(null);
  const [templateItems, setTemplateItems] = useState<OfflineTemplateItem[]>([]);
  const [responses, setResponses] = useState<OfflineAreaResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);

      try {
        // Try cache first
        const [cachedSession, cachedItems, cachedResponses] = await Promise.all([
          offlineDataCache.get<OfflineAreaSession>(CACHE_STORES.AREA_SESSIONS, `session_${sessionId}`),
          null as any, // Will fetch after we know template_id
          offlineDataCache.get<OfflineAreaResponse[]>(CACHE_STORES.AREA_RESPONSES, `responses_${sessionId}`),
        ]);

        if (!cachedSession.isMiss) {
          setSession(cachedSession.data);
          setIsCached(true);

          // Get template items using the template_id from session
          if (cachedSession.data?.template_id) {
            const items = await offlineDataCache.get<OfflineTemplateItem[]>(
              CACHE_STORES.TEMPLATE_ITEMS,
              `template_${cachedSession.data.template_id}`
            );
            if (!items.isMiss && items.data) {
              setTemplateItems(items.data);
            }
          }
        }

        if (!cachedResponses.isMiss && cachedResponses.data) {
          setResponses(cachedResponses.data);
        }

        // If online and cache is stale, revalidate
        if (isOnline && (cachedSession.isStale || cachedSession.isMiss)) {
          // Fetch fresh data in background
          const { data: freshSession } = await supabase
            .from('inspection_sessions')
            .select(`
              id, template_id, period, status, site_id, building_id, floor_zone_id,
              scope_notes, weather_conditions, attendees, gps_boundary,
              started_at, completed_at, inspector_id, tenant_id, created_at, updated_at,
              template:inspection_templates(id, name, name_ar, requires_photos, requires_gps)
            `)
            .eq('id', sessionId)
            .single();

          if (freshSession) {
            setSession(freshSession as unknown as OfflineAreaSession);
            await offlineDataCache.set(CACHE_STORES.AREA_SESSIONS, `session_${sessionId}`, freshSession, CACHE_CONFIG);

            // Refresh template items
            if (freshSession.template_id) {
              const { data: freshItems } = await supabase
                .from('inspection_template_items')
                .select('id, template_id, question, question_ar, response_type, is_critical, is_required, sort_order, instructions, instructions_ar')
                .eq('template_id', freshSession.template_id)
                .is('deleted_at', null)
                .order('sort_order');

              if (freshItems) {
                setTemplateItems(freshItems);
                await offlineDataCache.set(CACHE_STORES.TEMPLATE_ITEMS, `template_${freshSession.template_id}`, freshItems, CACHE_CONFIG);
              }
            }
          }

          // Refresh responses
          const { data: freshResponses } = await supabase
            .from('area_inspection_responses')
            .select('*')
            .eq('session_id', sessionId);

          if (freshResponses) {
            // Merge with any offline responses that haven't synced yet
            const offlineResponses = responses.filter(r => r._offline && r._syncStatus === 'pending');
            const mergedResponses = [...freshResponses, ...offlineResponses] as OfflineAreaResponse[];
            setResponses(mergedResponses);
            await offlineDataCache.set(CACHE_STORES.AREA_RESPONSES, `responses_${sessionId}`, mergedResponses, CACHE_CONFIG);
          }
        }
      } catch (error) {
        console.error('Failed to load offline area session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [sessionId, isOnline]);

  return { session, templateItems, responses, isLoading, isCached, isOnline };
}

/**
 * Hook to save area response offline
 */
export function useOfflineSaveAreaResponse() {
  const { user, profile } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { t } = useTranslation();

  const saveResponse = useCallback(async (input: SaveAreaResponseInput): Promise<OfflineAreaResponse | null> => {
    if (!user?.id || !profile?.tenant_id) {
      toast.error(t('auth.notAuthenticated', 'Not authenticated'));
      return null;
    }

    const responseId = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const offlineResponse: OfflineAreaResponse = {
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
      _syncStatus: 'pending',
    };

    // Get existing cached responses
    const cached = await offlineDataCache.get<OfflineAreaResponse[]>(
      CACHE_STORES.AREA_RESPONSES,
      `responses_${input.session_id}`
    );

    const existingResponses = cached.data || [];

    // Check if we're updating an existing response
    const existingIndex = existingResponses.findIndex(
      r => r.template_item_id === input.template_item_id
    );

    let updatedResponses: OfflineAreaResponse[];
    if (existingIndex >= 0) {
      // Update existing response
      updatedResponses = [...existingResponses];
      updatedResponses[existingIndex] = {
        ...updatedResponses[existingIndex],
        ...offlineResponse,
        id: existingResponses[existingIndex].id, // Keep original ID if it exists
      };
    } else {
      // Add new response
      updatedResponses = [...existingResponses, offlineResponse];
    }

    // Save to cache
    await offlineDataCache.set(
      CACHE_STORES.AREA_RESPONSES,
      `responses_${input.session_id}`,
      updatedResponses,
      CACHE_CONFIG
    );

    // Auto-create finding for FAIL result
    if (input.result === 'fail') {
      const findingId = `offline_finding_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const finding: OfflineAreaFinding = {
        id: findingId,
        tenant_id: profile.tenant_id,
        session_id: input.session_id,
        response_id: offlineResponse.id,
        reference_id: '', // Will be set when synced
        classification: 'observation',
        risk_level: 'medium',
        status: 'open',
        created_by: user.id,
        created_at: new Date().toISOString(),
        _offline: true,
        _syncStatus: 'pending',
      };

      // Get and update cached findings
      const cachedFindings = await offlineDataCache.get<OfflineAreaFinding[]>(
        CACHE_STORES.AREA_FINDINGS,
        `findings_${input.session_id}`
      );

      const existingFindings = cachedFindings.data || [];
      await offlineDataCache.set(
        CACHE_STORES.AREA_FINDINGS,
        `findings_${input.session_id}`,
        [...existingFindings, finding],
        CACHE_CONFIG
      );
    }

    if (!isOnline) {
      toast.info(t('offline.savedOffline', 'Saved offline - will sync when connected'));
    }

    return offlineResponse;
  }, [user?.id, profile?.tenant_id, isOnline, t]);

  return { saveResponse };
}

/**
 * Hook to get pending offline responses count
 */
export function usePendingAreaResponsesCount(sessionId: string | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setCount(0);
      return;
    }

    const checkPending = async () => {
      const cached = await offlineDataCache.get<OfflineAreaResponse[]>(
        CACHE_STORES.AREA_RESPONSES,
        `responses_${sessionId}`
      );

      if (cached.data) {
        const pendingCount = cached.data.filter(r => r._offline && r._syncStatus === 'pending').length;
        setCount(pendingCount);
      }
    };

    checkPending();
    // Poll every 2 seconds
    const interval = setInterval(checkPending, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  return count;
}
