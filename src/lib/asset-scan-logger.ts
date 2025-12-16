import { supabase } from '@/integrations/supabase/client';
import { offlineDataCache, CACHE_STORES } from '@/lib/offline-data-cache';

export interface AssetScanEvent {
  asset_id: string | null;
  asset_code: string;
  scan_action: 'view' | 'inspect' | 'maintenance' | 'transfer';
  scan_method: 'barcode' | 'qrcode' | 'manual';
  scan_result: 'success' | 'not_found' | 'wrong_tenant';
  device_info?: {
    user_agent: string;
    platform: string;
  };
  location_data?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

/**
 * Log an asset scan event to the database
 * Falls back to offline cache if network is unavailable
 */
export async function logAssetScan(event: AssetScanEvent): Promise<void> {
  try {
    // Get current user and tenant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('Cannot log scan: no authenticated user');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      console.warn('Cannot log scan: no tenant found for user');
      return;
    }

    // Collect device info
    const deviceInfo = {
      user_agent: navigator.userAgent,
      platform: navigator.platform,
    };

    // Try to get location (non-blocking)
    let locationData: AssetScanEvent['location_data'] | undefined;
    try {
      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 3000,
            maximumAge: 60000,
          });
        });
        locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      }
    } catch {
      // Location not available, continue without it
    }

    const scanLogEntry = {
      tenant_id: profile.tenant_id,
      asset_id: event.asset_id,
      asset_code: event.asset_code,
      scanned_by: user.id,
      scan_action: event.scan_action,
      scan_method: event.scan_method,
      scan_result: event.scan_result,
      device_info: deviceInfo,
      location_data: locationData,
      is_offline_scan: false,
    };

    // Try to insert directly
    const { error } = await supabase
      .from('asset_scan_logs')
      .insert(scanLogEntry);

    if (error) {
      // If network error, queue for offline sync
      if (error.message.includes('network') || error.message.includes('fetch')) {
        await queueOfflineScan(scanLogEntry);
      } else {
        console.error('Error logging asset scan:', error);
      }
    }
  } catch (err) {
    console.error('Error in logAssetScan:', err);
    // Try to queue offline if any error
    try {
      await queueOfflineScan({
        ...event,
        is_offline_scan: true,
      } as any);
    } catch {
      // Silent fail - scan logging is non-critical
    }
  }
}

/**
 * Queue a scan log for offline sync
 */
async function queueOfflineScan(scanData: any): Promise<void> {
  const key = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await offlineDataCache.set(CACHE_STORES.SCAN_LOGS, key, {
    ...scanData,
    is_offline_scan: true,
    queued_at: new Date().toISOString(),
  });
}

/**
 * Sync pending offline scans to the database
 */
export async function syncPendingScans(): Promise<number> {
  try {
    const pending = await offlineDataCache.getAll<any>(CACHE_STORES.SCAN_LOGS);
    
    if (pending.length === 0) return 0;

    let synced = 0;
    for (const entry of pending) {
      try {
        const { error } = await supabase
          .from('asset_scan_logs')
          .insert({
            ...entry.data,
            synced_at: new Date().toISOString(),
          });

        if (!error) {
          await offlineDataCache.delete(CACHE_STORES.SCAN_LOGS, entry.key);
          synced++;
        }
      } catch {
        // Continue with next entry
      }
    }

    return synced;
  } catch (err) {
    console.error('Error syncing pending scans:', err);
    return 0;
  }
}
