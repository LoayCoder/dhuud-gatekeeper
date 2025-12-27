import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { offlineDataCache, CACHE_STORES } from '@/lib/offline-data-cache';

export type OfflineActionType = 'inspection' | 'condition_update' | 'maintenance_log' | 'transfer' | 'scan_log' | 'photo_upload';

export interface OfflineAction {
  id: string;
  device_id: string;
  asset_id?: string;
  asset_code?: string;
  action_type: OfflineActionType;
  action_data: Record<string, unknown>;
  gps_lat?: number;
  gps_lng?: number;
  gps_accuracy?: number;
  captured_at: string;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  sync_error?: string;
}

const OFFLINE_ACTIONS_KEY = 'asset_offline_actions_queue';

function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

async function getCurrentPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export function useAssetOfflineActions() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [queue, setQueue] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load queue from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(OFFLINE_ACTIONS_KEY);
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse offline actions:', e);
      }
    }
  }, []);

  // Save queue to localStorage on change
  useEffect(() => {
    localStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(queue));
  }, [queue]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: t('common.backOnline', 'Back Online'),
        description: t('common.syncingData', 'Syncing offline data...'),
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: t('common.offline', 'Offline'),
        description: t('common.offlineMode', 'You are now in offline mode. Actions will be synced when back online.'),
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [t]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && queue.some(a => a.sync_status === 'pending' || a.sync_status === 'failed')) {
      syncQueue();
    }
  }, [isOnline]);

  const addAction = useCallback(async (
    actionType: OfflineActionType,
    actionData: Record<string, unknown>,
    assetId?: string,
    assetCode?: string
  ): Promise<string> => {
    const gpsData = await getCurrentPosition();
    
    const newAction: OfflineAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      device_id: getDeviceId(),
      asset_id: assetId,
      asset_code: assetCode,
      action_type: actionType,
      action_data: actionData,
      gps_lat: gpsData?.lat,
      gps_lng: gpsData?.lng,
      gps_accuracy: gpsData?.accuracy,
      captured_at: new Date().toISOString(),
      sync_status: 'pending',
    };

    setQueue(prev => [...prev, newAction]);

    // Try immediate sync if online
    if (isOnline) {
      await syncAction(newAction);
    }

    return newAction.id;
  }, [isOnline]);

  const syncAction = async (action: OfflineAction) => {
    if (!user?.id || !profile?.tenant_id) return;

    try {
      setQueue(prev => prev.map(a => 
        a.id === action.id ? { ...a, sync_status: 'syncing' as const } : a
      ));

      const { error } = await supabase
        .from('asset_offline_actions')
        .insert({
          tenant_id: profile.tenant_id,
          device_id: action.device_id,
          asset_id: action.asset_id,
          asset_code: action.asset_code,
          action_type: action.action_type,
          action_data: action.action_data as any,
          gps_lat: action.gps_lat,
          gps_lng: action.gps_lng,
          gps_accuracy: action.gps_accuracy,
          captured_at: action.captured_at,
          sync_status: 'synced',
          synced_at: new Date().toISOString(),
          created_by: user.id,
        } as any);

      if (error) throw error;

      setQueue(prev => prev.map(a => 
        a.id === action.id ? { ...a, sync_status: 'synced' as const } : a
      ));

      // Remove synced action after delay
      setTimeout(() => {
        setQueue(prev => prev.filter(a => a.id !== action.id));
      }, 3000);

    } catch (error) {
      console.error('Failed to sync action:', error);
      setQueue(prev => prev.map(a => 
        a.id === action.id 
          ? { ...a, sync_status: 'failed' as const, sync_error: String(error) } 
          : a
      ));
    }
  };

  const syncQueue = async () => {
    if (isSyncing || !user?.id || !profile?.tenant_id) return;

    const pendingActions = queue.filter(a => 
      a.sync_status === 'pending' || a.sync_status === 'failed'
    );
    
    if (pendingActions.length === 0) return;

    setIsSyncing(true);

    try {
      for (const action of pendingActions) {
        await syncAction(action);
      }

      const syncedCount = queue.filter(a => a.sync_status === 'synced').length;
      if (syncedCount > 0) {
        toast({
          title: t('assets.offline.syncComplete', 'Sync Complete'),
          description: t('assets.offline.actionsSynced', '{{count}} actions synced', { count: syncedCount }),
        });
      }
    } catch (error) {
      toast({
        title: t('assets.offline.syncError', 'Sync Error'),
        description: t('assets.offline.someFailed', 'Some actions failed to sync'),
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const retryFailed = useCallback(() => {
    setQueue(prev => prev.map(a => 
      a.sync_status === 'failed' 
        ? { ...a, sync_status: 'pending' as const, sync_error: undefined } 
        : a
    ));
    if (isOnline) {
      syncQueue();
    }
  }, [isOnline]);

  const clearSynced = useCallback(() => {
    setQueue(prev => prev.filter(a => a.sync_status !== 'synced'));
  }, []);

  return {
    queue,
    isOnline,
    isSyncing,
    pendingCount: queue.filter(a => a.sync_status === 'pending').length,
    failedCount: queue.filter(a => a.sync_status === 'failed').length,
    addAction,
    syncQueue,
    retryFailed,
    clearSynced,
  };
}

// Hook to prefetch asset data for offline use
export function useAssetOfflineCache() {
  const { profile } = useAuth();

  const prefetchAsset = useCallback(async (assetId: string) => {
    try {
      const { data } = await supabase
        .from('hsse_assets')
        .select('id, asset_code, name, status, condition_rating, location_description')
        .eq('id', assetId)
        .single();

      if (data) {
        await offlineDataCache.set(CACHE_STORES.ASSETS, `asset_${assetId}`, data);
      }
    } catch (error) {
      console.error('Failed to cache asset:', error);
    }
  }, []);

  const getCachedAsset = useCallback(async (assetId: string) => {
    const result = await offlineDataCache.get(CACHE_STORES.ASSETS, `asset_${assetId}`);
    return result.data;
  }, []);

  const prefetchRecentAssets = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      const { data } = await supabase
        .from('hsse_assets')
        .select('id, asset_code, name, status, condition_rating')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (data) {
        for (const asset of data) {
          await offlineDataCache.set(CACHE_STORES.ASSETS, `asset_${asset.id}`, asset as any);
        }
      }
    } catch (error) {
      console.error('Failed to prefetch assets:', error);
    }
  }, [profile?.tenant_id]);

  return {
    prefetchAsset,
    getCachedAsset,
    prefetchRecentAssets,
  };
}
