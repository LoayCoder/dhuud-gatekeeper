/**
 * Offline Report Sync Service
 * Handles syncing offline-created reports when back online
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { offlineDataCache, CACHE_STORES } from '@/lib/offline-data-cache';
import type { OfflineReport, OfflineReportSyncStatus } from '@/hooks/use-offline-report-queue';
import type { IncidentFormData } from '@/hooks/use-incidents';

export interface SyncResult {
  success: number;
  failed: number;
  errors: Array<{ reportId: string; error: string }>;
}

/**
 * Sync all pending offline reports
 */
export async function syncOfflineReports(): Promise<SyncResult> {
  const result: SyncResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get all pending reports from IndexedDB
    const allEntries = await offlineDataCache.getAll<OfflineReport>(CACHE_STORES.PENDING_ACTIONS);
    const pendingReports = allEntries
      .filter(entry => entry.key.startsWith('offline_report_'))
      .map(entry => ({ key: entry.key, report: entry.data }))
      .filter(({ report }) => 
        report.sync_status === 'pending' || 
        (report.sync_status === 'failed' && report.retry_count < 3)
      )
      .sort((a, b) => 
        new Date(a.report.created_at).getTime() - new Date(b.report.created_at).getTime()
      );

    if (pendingReports.length === 0) {
      logger.debug('[OfflineSync] No pending reports to sync');
      return result;
    }

    logger.debug(`[OfflineSync] Starting sync of ${pendingReports.length} reports`);

    // Process reports sequentially to avoid conflicts
    for (const { key, report } of pendingReports) {
      try {
        // Update status to syncing
        await updateReportStatus(key, report, 'syncing');

        // Sync the report
        const syncedReport = await syncSingleReport(report);

        // Update status to synced
        await updateReportStatus(key, report, 'synced', {
          server_id: syncedReport.id,
          server_reference_id: syncedReport.reference_id,
          synced_at: new Date().toISOString(),
        });

        result.success++;
        logger.info(`[OfflineSync] Synced report ${report.id} -> ${syncedReport.reference_id}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`[OfflineSync] Failed to sync report ${report.id}:`, err);

        // Update status to failed
        await updateReportStatus(key, report, 'failed', {
          sync_error: errorMessage,
        });

        result.failed++;
        result.errors.push({ reportId: report.id, error: errorMessage });
      }
    }

    logger.info(`[OfflineSync] Sync complete: ${result.success} success, ${result.failed} failed`);
    return result;
  } catch (err) {
    logger.error('[OfflineSync] Sync process failed:', err);
    throw err;
  }
}

/**
 * Sync a single offline report
 */
async function syncSingleReport(report: OfflineReport): Promise<{ id: string; reference_id: string }> {
  const { form_data, gps_data, photos, closed_on_spot_photos, video, tenant_id, user_id } = report;

  // 1. Upload photos to Supabase Storage
  const uploadedPhotoPaths: string[] = [];
  const uploadedClosedOnSpotPaths: string[] = [];

  // Create a temporary incident ID for storage paths
  const tempId = `offline_${report.id}`;

  // Upload main photos
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const fileName = `${Date.now()}-${i}-${photo.filename}`;
    const uploadPath = `${tenant_id}/${tempId}/photos/${fileName}`;

    const { error } = await supabase.storage
      .from('incident-attachments')
      .upload(uploadPath, photo.blob, {
        contentType: photo.mime_type,
      });

    if (error) {
      logger.error(`[OfflineSync] Failed to upload photo ${i}:`, error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }

    uploadedPhotoPaths.push(uploadPath);
  }

  // Upload closed-on-spot photos
  for (let i = 0; i < closed_on_spot_photos.length; i++) {
    const photo = closed_on_spot_photos[i];
    const fileName = `${Date.now()}-${i}-${photo.filename}`;
    const uploadPath = `${tenant_id}/${tempId}/closed-on-spot/${fileName}`;

    const { error } = await supabase.storage
      .from('incident-attachments')
      .upload(uploadPath, photo.blob, {
        contentType: photo.mime_type,
      });

    if (error) {
      logger.error(`[OfflineSync] Failed to upload closed-on-spot photo ${i}:`, error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }

    uploadedClosedOnSpotPaths.push(uploadPath);
  }

  // Upload video if exists
  let videoPath: string | undefined;
  if (video) {
    const fileName = `${Date.now()}-${video.filename}`;
    const uploadPath = `${tenant_id}/${tempId}/videos/${fileName}`;

    const { error } = await supabase.storage
      .from('incident-attachments')
      .upload(uploadPath, video.blob, {
        contentType: video.mime_type,
      });

    if (error) {
      console.error('[OfflineSync] Failed to upload video:', error);
      // Don't fail the whole sync for video upload failure
    } else {
      videoPath = uploadPath;
    }
  }

  // 2. Create incident record
  const isObservation = form_data.event_type === 'observation';

  // Build immediate_actions_data for closed-on-spot
  let immediateActionsData: Record<string, unknown> | undefined;
  if (form_data.closed_on_spot && uploadedClosedOnSpotPaths.length > 0) {
    immediateActionsData = {
      closed_on_spot: true,
      photo_paths: uploadedClosedOnSpotPaths,
    };
  }

  const incidentData = {
    title: form_data.title,
    description: form_data.description,
    event_type: form_data.event_type,
    subtype: form_data.subtype,
    occurred_at: form_data.occurred_at,
    location: form_data.location,
    department: form_data.department_id,
    severity: isObservation ? null : form_data.severity,
    risk_rating: isObservation ? form_data.risk_rating : null,
    immediate_actions: form_data.immediate_actions,
    immediate_actions_data: immediateActionsData,
    has_injury: form_data.has_injury || false,
    injury_details: form_data.has_injury ? {
      count: form_data.injury_count,
      description: form_data.injury_description,
    } : null,
    has_damage: form_data.has_damage || false,
    damage_details: form_data.has_damage ? {
      description: form_data.damage_description,
      estimated_cost: form_data.damage_cost,
    } : null,
    site_id: form_data.site_id,
    branch_id: form_data.branch_id,
    department_id: form_data.department_id,
    latitude: gps_data?.latitude,
    longitude: gps_data?.longitude,
    related_contractor_company_id: form_data.is_against_contractor 
      ? form_data.related_contractor_company_id 
      : null,
    tenant_id,
    reported_by: user_id,
    status: form_data.closed_on_spot ? 'closed' : 'open',
    // Media paths (stored as JSON array)
    photo_paths: uploadedPhotoPaths.length > 0 ? uploadedPhotoPaths : null,
    video_path: videoPath,
    // Offline sync metadata
    offline_sync_id: report.id,
    offline_synced_at: new Date().toISOString(),
  };

  const { data: incident, error: insertError } = await supabase
    .from('incidents')
    .insert(incidentData as any)
    .select('id, reference_id')
    .single();

  if (insertError) {
    console.error('[OfflineSync] Failed to create incident:', insertError);
    throw new Error(`Failed to create incident: ${insertError.message}`);
  }

  // 3. Link asset if specified
  if (form_data.linked_asset_id && incident.id) {
    const { error: linkError } = await (supabase as any)
      .from('incident_assets')
      .insert({
        incident_id: incident.id,
        asset_id: form_data.linked_asset_id,
        link_type: 'involved',
        tenant_id,
      });

    if (linkError) {
      console.error('[OfflineSync] Failed to link asset:', linkError);
      // Don't fail the whole sync for asset linking failure
    }
  }

  // 4. Create AI tags if specified
  if (form_data.selected_tags && form_data.selected_tags.length > 0) {
    const tagInserts = form_data.selected_tags.map(tagId => ({
      incident_id: incident.id,
      tag_id: tagId,
      tenant_id,
    }));

    const { error: tagsError } = await (supabase as any)
      .from('incident_tags')
      .insert(tagInserts);

    if (tagsError) {
      console.error('[OfflineSync] Failed to add tags:', tagsError);
      // Don't fail for tag insertion failure
    }
  }

  // 5. Move uploaded files to correct path (replace tempId with real id)
  // This is optional - files can stay in offline_xxx path

  // 6. Trigger notification dispatch (via edge function or realtime)
  try {
    await supabase.functions.invoke('dispatch-incident-notification', {
      body: {
        incident_id: incident.id,
        was_offline: true,
      },
    });
  } catch (notifyErr) {
    console.error('[OfflineSync] Failed to dispatch notification:', notifyErr);
    // Don't fail sync for notification failure
  }

  return {
    id: incident.id,
    reference_id: incident.reference_id || '',
  };
}

/**
 * Update report status in IndexedDB
 */
async function updateReportStatus(
  key: string,
  report: OfflineReport,
  status: OfflineReportSyncStatus,
  extra?: Partial<OfflineReport>
): Promise<void> {
  const updated: OfflineReport = {
    ...report,
    sync_status: status,
    retry_count: status === 'failed' ? report.retry_count + 1 : report.retry_count,
    ...extra,
  };

  await offlineDataCache.set(
    CACHE_STORES.PENDING_ACTIONS,
    key,
    updated,
    { maxAge: 7 * 24 * 60 * 60 * 1000 }
  );
}

/**
 * Check if there are pending reports to sync
 */
export async function hasPendingReports(): Promise<boolean> {
  try {
    const allEntries = await offlineDataCache.getAll<OfflineReport>(CACHE_STORES.PENDING_ACTIONS);
    return allEntries.some(entry => 
      entry.key.startsWith('offline_report_') && 
      (entry.data.sync_status === 'pending' || 
       (entry.data.sync_status === 'failed' && entry.data.retry_count < 3))
    );
  } catch {
    return false;
  }
}
