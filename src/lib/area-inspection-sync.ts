/**
 * Area Inspection Sync Service
 * Handles syncing offline area inspection data to Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import { offlineDataCache, CACHE_STORES } from './offline-data-cache';
import type { OfflineAreaResponse, OfflineAreaFinding } from '@/hooks/use-offline-area-inspection';

const SYNC_TAG = 'area-inspection-sync';

export interface SyncResult {
  responses: { success: number; failed: number };
  findings: { success: number; failed: number };
}

/**
 * Sync all pending area inspection responses for a session
 */
export async function syncAreaResponses(sessionId: string, tenantId: string): Promise<{ success: number; failed: number }> {
  const result = { success: 0, failed: 0 };

  try {
    const cached = await offlineDataCache.get<OfflineAreaResponse[]>(
      CACHE_STORES.AREA_RESPONSES,
      `responses_${sessionId}`
    );

    if (!cached.data) return result;

    const pendingResponses = cached.data.filter(r => r._offline && r._syncStatus === 'pending');

    for (const response of pendingResponses) {
      try {
        // Check if response already exists (by template_item_id)
        const { data: existing } = await supabase
          .from('area_inspection_responses')
          .select('id')
          .eq('session_id', sessionId)
          .eq('template_item_id', response.template_item_id)
          .maybeSingle();

        const responseData = {
          response_value: response.response_value || null,
          result: response.result || null,
          notes: response.notes || null,
          photo_paths: response.photo_paths || [],
          gps_lat: response.gps_lat || null,
          gps_lng: response.gps_lng || null,
          gps_accuracy: response.gps_accuracy || null,
          responded_by: response.responded_by,
          responded_at: response.responded_at,
        };

        if (existing) {
          // Update existing response
          const { error } = await supabase
            .from('area_inspection_responses')
            .update(responseData)
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          // Insert new response
          const { error } = await supabase
            .from('area_inspection_responses')
            .insert({
              ...responseData,
              session_id: sessionId,
              template_item_id: response.template_item_id,
              tenant_id: tenantId,
            });

          if (error) throw error;
        }

        // Mark as synced in cache
        response._syncStatus = 'synced';
        result.success++;
      } catch (error) {
        console.error('Failed to sync response:', error);
        response._syncStatus = 'failed';
        result.failed++;
      }
    }

    // Update cache with sync status
    await offlineDataCache.set(
      CACHE_STORES.AREA_RESPONSES,
      `responses_${sessionId}`,
      cached.data,
      { maxAge: 7 * 24 * 60 * 60 * 1000 }
    );
  } catch (error) {
    console.error('Failed to sync area responses:', error);
  }

  return result;
}

/**
 * Sync all pending area inspection findings for a session
 */
export async function syncAreaFindings(sessionId: string, tenantId: string): Promise<{ success: number; failed: number }> {
  const result = { success: 0, failed: 0 };

  try {
    const cached = await offlineDataCache.get<OfflineAreaFinding[]>(
      CACHE_STORES.AREA_FINDINGS,
      `findings_${sessionId}`
    );

    if (!cached.data) return result;

    const pendingFindings = cached.data.filter(f => f._offline && f._syncStatus === 'pending');

    // First sync responses to get real IDs
    const responsesCache = await offlineDataCache.get<OfflineAreaResponse[]>(
      CACHE_STORES.AREA_RESPONSES,
      `responses_${sessionId}`
    );

    for (const finding of pendingFindings) {
      try {
        // Find the matching synced response
        const offlineResponse = responsesCache.data?.find(r => r.id === finding.response_id);
        
        // Get the real response ID from the database
        let realResponseId = finding.response_id;
        
        if (offlineResponse && offlineResponse._offline) {
          // Look up the real response by template_item_id
          const { data: dbResponse } = await supabase
            .from('area_inspection_responses')
            .select('id')
            .eq('session_id', sessionId)
            .eq('template_item_id', offlineResponse.template_item_id)
            .maybeSingle();

          if (dbResponse) {
            realResponseId = dbResponse.id;
          } else {
            console.warn('Could not find synced response for finding, skipping');
            finding._syncStatus = 'failed';
            result.failed++;
            continue;
          }
        }

        // Check if finding already exists for this response
        const { data: existing } = await supabase
          .from('area_inspection_findings')
          .select('id')
          .eq('response_id', realResponseId)
          .is('deleted_at', null)
          .maybeSingle();

        if (!existing) {
          // Insert new finding
          const { error } = await supabase
            .from('area_inspection_findings')
            .insert({
              tenant_id: tenantId,
              session_id: sessionId,
              response_id: realResponseId,
              reference_id: '', // Will be set by trigger
              classification: finding.classification,
              risk_level: finding.risk_level,
              status: finding.status,
              description: finding.description,
              recommendation: finding.recommendation,
              due_date: finding.due_date,
              created_by: finding.created_by,
            });

          if (error) throw error;
        }

        // Mark as synced
        finding._syncStatus = 'synced';
        result.success++;
      } catch (error) {
        console.error('Failed to sync finding:', error);
        finding._syncStatus = 'failed';
        result.failed++;
      }
    }

    // Update cache with sync status
    await offlineDataCache.set(
      CACHE_STORES.AREA_FINDINGS,
      `findings_${sessionId}`,
      cached.data,
      { maxAge: 7 * 24 * 60 * 60 * 1000 }
    );
  } catch (error) {
    console.error('Failed to sync area findings:', error);
  }

  return result;
}

/**
 * Sync all pending data for a session
 */
export async function syncAreaSession(sessionId: string, tenantId: string): Promise<SyncResult> {
  // Sync responses first (findings depend on response IDs)
  const responseResult = await syncAreaResponses(sessionId, tenantId);
  
  // Then sync findings
  const findingResult = await syncAreaFindings(sessionId, tenantId);

  return {
    responses: responseResult,
    findings: findingResult,
  };
}

/**
 * Sync all pending area inspections across all sessions
 */
export async function syncAllAreaInspections(tenantId: string): Promise<SyncResult> {
  const totalResult: SyncResult = {
    responses: { success: 0, failed: 0 },
    findings: { success: 0, failed: 0 },
  };

  try {
    // Get all cached sessions
    const sessions = await offlineDataCache.getAll<any>(CACHE_STORES.AREA_SESSIONS);

    for (const session of sessions) {
      if (session.data?.id) {
        const result = await syncAreaSession(session.data.id, tenantId);
        totalResult.responses.success += result.responses.success;
        totalResult.responses.failed += result.responses.failed;
        totalResult.findings.success += result.findings.success;
        totalResult.findings.failed += result.findings.failed;
      }
    }
  } catch (error) {
    console.error('Failed to sync all area inspections:', error);
  }

  return totalResult;
}

/**
 * Register background sync for area inspections
 */
export async function registerAreaInspectionSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as ServiceWorkerRegistration & { 
      sync: { register: (tag: string) => Promise<void> } 
    }).sync.register(SYNC_TAG);
    return true;
  } catch (error) {
    console.warn('Background sync registration failed:', error);
    return false;
  }
}

/**
 * Clear synced data from cache (cleanup)
 */
export async function clearSyncedData(sessionId: string): Promise<void> {
  try {
    // Clear synced responses
    const responsesCache = await offlineDataCache.get<OfflineAreaResponse[]>(
      CACHE_STORES.AREA_RESPONSES,
      `responses_${sessionId}`
    );

    if (responsesCache.data) {
      const pendingOnly = responsesCache.data.filter(r => r._syncStatus !== 'synced');
      if (pendingOnly.length === 0) {
        await offlineDataCache.delete(CACHE_STORES.AREA_RESPONSES, `responses_${sessionId}`);
      } else {
        await offlineDataCache.set(
          CACHE_STORES.AREA_RESPONSES,
          `responses_${sessionId}`,
          pendingOnly,
          { maxAge: 7 * 24 * 60 * 60 * 1000 }
        );
      }
    }

    // Clear synced findings
    const findingsCache = await offlineDataCache.get<OfflineAreaFinding[]>(
      CACHE_STORES.AREA_FINDINGS,
      `findings_${sessionId}`
    );

    if (findingsCache.data) {
      const pendingOnly = findingsCache.data.filter(f => f._syncStatus !== 'synced');
      if (pendingOnly.length === 0) {
        await offlineDataCache.delete(CACHE_STORES.AREA_FINDINGS, `findings_${sessionId}`);
      } else {
        await offlineDataCache.set(
          CACHE_STORES.AREA_FINDINGS,
          `findings_${sessionId}`,
          pendingOnly,
          { maxAge: 7 * 24 * 60 * 60 * 1000 }
        );
      }
    }
  } catch (error) {
    console.error('Failed to clear synced data:', error);
  }
}
