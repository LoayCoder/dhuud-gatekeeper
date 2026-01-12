/**
 * Offline Report Queue Hook
 * Manages locally stored offline-created reports with photos
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineDataCache, CACHE_STORES } from '@/lib/offline-data-cache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export type OfflineReportSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface OfflineReportGPSData {
  latitude: number;
  longitude: number;
  accuracy: number;
  captured_at: string;
}

export interface OfflineReportPhoto {
  id: string;
  filename: string;
  blob: Blob;
  size: number;
  mime_type: string;
}

export interface OfflineReportVideo {
  id: string;
  filename: string;
  blob: Blob;
  size: number;
  mime_type: string;
}

export interface OfflineReportFormData {
  title: string;
  description: string;
  event_type: 'observation' | 'incident';
  incident_type?: string;
  subtype: string;
  occurred_at: string;
  site_id?: string;
  branch_id?: string;
  department_id?: string;
  location: string;
  severity?: string;
  risk_rating?: string;
  immediate_actions: string;
  has_injury?: boolean;
  injury_count?: number;
  injury_description?: string;
  has_damage?: boolean;
  damage_description?: string;
  damage_cost?: number;
  is_against_contractor?: boolean;
  related_contractor_company_id?: string;
  selected_tags?: string[];
  // Asset selection
  linked_asset_id?: string;
  // Closed on spot (observations)
  closed_on_spot?: boolean;
}

export interface OfflineReport {
  id: string;
  created_at: string;
  sync_status: OfflineReportSyncStatus;
  sync_error?: string;
  synced_at?: string;
  server_id?: string;
  server_reference_id?: string;
  retry_count: number;
  
  // Report data
  form_data: OfflineReportFormData;
  gps_data: OfflineReportGPSData | null;
  
  // Attachments stored as blobs
  photos: OfflineReportPhoto[];
  closed_on_spot_photos: OfflineReportPhoto[];
  video?: OfflineReportVideo;
  
  // Metadata
  tenant_id: string;
  user_id: string;
  device_id: string;
}

const QUEUE_KEY = 'offline_report_queue';
const MAX_RETRY_COUNT = 3;

// Generate a simple device ID if not exists
function getDeviceId(): string {
  const key = 'dhuud_device_id';
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}

export function useOfflineReportQueue() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const [pendingReports, setPendingReports] = useState<OfflineReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load pending reports on mount
  useEffect(() => {
    loadPendingReports();
  }, []);

  const loadPendingReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await offlineDataCache.getAll<OfflineReport>(CACHE_STORES.PENDING_ACTIONS);
      const reports = all
        .filter(entry => entry.key.startsWith('offline_report_'))
        .map(entry => entry.data)
        .filter(report => report.sync_status !== 'synced')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      setPendingReports(reports);
    } catch (err) {
      console.error('[OfflineQueue] Failed to load pending reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addReport = useCallback(async (
    formData: OfflineReportFormData,
    gpsData: OfflineReportGPSData | null,
    photos: File[],
    closedOnSpotPhotos: File[],
    video: File | null
  ): Promise<string | null> => {
    if (!profile?.tenant_id || !user?.id) {
      console.error('[OfflineQueue] Missing tenant or user ID');
      return null;
    }

    try {
      const reportId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Convert files to blobs with metadata
      const photoBlobs: OfflineReportPhoto[] = await Promise.all(
        photos.map(async (file, index) => ({
          id: `photo_${index}_${Date.now()}`,
          filename: file.name,
          blob: file,
          size: file.size,
          mime_type: file.type || 'image/jpeg',
        }))
      );

      const closedOnSpotBlobs: OfflineReportPhoto[] = await Promise.all(
        closedOnSpotPhotos.map(async (file, index) => ({
          id: `closed_photo_${index}_${Date.now()}`,
          filename: file.name,
          blob: file,
          size: file.size,
          mime_type: file.type || 'image/jpeg',
        }))
      );

      let videoBlob: OfflineReportVideo | undefined;
      if (video) {
        videoBlob = {
          id: `video_${Date.now()}`,
          filename: video.name,
          blob: video,
          size: video.size,
          mime_type: video.type || 'video/mp4',
        };
      }

      const offlineReport: OfflineReport = {
        id: reportId,
        created_at: new Date().toISOString(),
        sync_status: 'pending',
        retry_count: 0,
        form_data: formData,
        gps_data: gpsData,
        photos: photoBlobs,
        closed_on_spot_photos: closedOnSpotBlobs,
        video: videoBlob,
        tenant_id: profile.tenant_id,
        user_id: user.id,
        device_id: getDeviceId(),
      };

      // Store in IndexedDB
      await offlineDataCache.set(
        CACHE_STORES.PENDING_ACTIONS,
        `offline_report_${reportId}`,
        offlineReport,
        { maxAge: 7 * 24 * 60 * 60 * 1000 } // Keep for 7 days
      );

      console.log('[OfflineQueue] Report queued:', reportId);

      // Update local state
      setPendingReports(prev => [...prev, offlineReport]);

      toast.success(t('offline.reportSavedOffline'), {
        description: t('offline.willSyncWhenOnline'),
      });

      return reportId;
    } catch (err) {
      console.error('[OfflineQueue] Failed to queue report:', err);
      toast.error(t('offline.failedToSaveOffline'));
      return null;
    }
  }, [profile?.tenant_id, user?.id, t]);

  const updateReportStatus = useCallback(async (
    reportId: string,
    status: OfflineReportSyncStatus,
    extra?: {
      sync_error?: string;
      server_id?: string;
      server_reference_id?: string;
      synced_at?: string;
    }
  ) => {
    try {
      const cached = await offlineDataCache.get<OfflineReport>(
        CACHE_STORES.PENDING_ACTIONS,
        `offline_report_${reportId}`
      );

      if (!cached.data) {
        console.error('[OfflineQueue] Report not found:', reportId);
        return;
      }

      const updated: OfflineReport = {
        ...cached.data,
        sync_status: status,
        retry_count: status === 'failed' ? cached.data.retry_count + 1 : cached.data.retry_count,
        ...extra,
      };

      await offlineDataCache.set(
        CACHE_STORES.PENDING_ACTIONS,
        `offline_report_${reportId}`,
        updated,
        { maxAge: 7 * 24 * 60 * 60 * 1000 }
      );

      // Update local state
      setPendingReports(prev => 
        prev.map(r => r.id === reportId ? updated : r)
          .filter(r => r.sync_status !== 'synced')
      );
    } catch (err) {
      console.error('[OfflineQueue] Failed to update report status:', err);
    }
  }, []);

  const removeReport = useCallback(async (reportId: string) => {
    try {
      await offlineDataCache.delete(
        CACHE_STORES.PENDING_ACTIONS,
        `offline_report_${reportId}`
      );

      setPendingReports(prev => prev.filter(r => r.id !== reportId));
      console.log('[OfflineQueue] Report removed:', reportId);
    } catch (err) {
      console.error('[OfflineQueue] Failed to remove report:', err);
    }
  }, []);

  const getReport = useCallback(async (reportId: string): Promise<OfflineReport | null> => {
    try {
      const cached = await offlineDataCache.get<OfflineReport>(
        CACHE_STORES.PENDING_ACTIONS,
        `offline_report_${reportId}`
      );
      return cached.data;
    } catch (err) {
      console.error('[OfflineQueue] Failed to get report:', err);
      return null;
    }
  }, []);

  const getPendingReports = useCallback(async (): Promise<OfflineReport[]> => {
    await loadPendingReports();
    return pendingReports.filter(r => 
      r.sync_status === 'pending' || 
      (r.sync_status === 'failed' && r.retry_count < MAX_RETRY_COUNT)
    );
  }, [pendingReports, loadPendingReports]);

  const clearSyncedReports = useCallback(async () => {
    try {
      const all = await offlineDataCache.getAll<OfflineReport>(CACHE_STORES.PENDING_ACTIONS);
      const syncedReports = all
        .filter(entry => entry.key.startsWith('offline_report_'))
        .filter(entry => entry.data.sync_status === 'synced');

      for (const entry of syncedReports) {
        await offlineDataCache.delete(CACHE_STORES.PENDING_ACTIONS, entry.key);
      }

      console.log('[OfflineQueue] Cleared synced reports:', syncedReports.length);
    } catch (err) {
      console.error('[OfflineQueue] Failed to clear synced reports:', err);
    }
  }, []);

  const pendingCount = pendingReports.filter(r => 
    r.sync_status === 'pending' || 
    (r.sync_status === 'failed' && r.retry_count < MAX_RETRY_COUNT)
  ).length;

  return {
    // State
    pendingReports,
    pendingCount,
    isLoading,

    // Actions
    addReport,
    updateReportStatus,
    removeReport,
    getReport,
    getPendingReports,
    clearSyncedReports,
    refreshQueue: loadPendingReports,
  };
}
