import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface OfflineScan {
  id: string;
  device_id: string;
  scan_type: 'visitor_qr' | 'contractor_qr' | 'worker_qr' | 'checkpoint_nfc' | 'checkpoint_gps';
  scan_data: Record<string, unknown>;
  scanned_at: string;
  gps_lat?: number;
  gps_lng?: number;
  gps_accuracy?: number;
  sync_status: 'pending' | 'synced' | 'failed' | 'conflict';
  sync_error?: string;
}

const STORAGE_KEY = 'offline_scan_queue';

function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

export function useOfflineScanQueue() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [queue, setQueue] = useState<OfflineScan[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load queue from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse offline queue:', e);
      }
    }
  }, []);

  // Save queue to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && queue.some(s => s.sync_status === 'pending')) {
      syncQueue();
    }
  }, [isOnline]);

  const addScan = useCallback((
    scanType: OfflineScan['scan_type'],
    scanData: Record<string, unknown>,
    gpsData?: { lat: number; lng: number; accuracy: number }
  ) => {
    const newScan: OfflineScan = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      device_id: getDeviceId(),
      scan_type: scanType,
      scan_data: scanData,
      scanned_at: new Date().toISOString(),
      gps_lat: gpsData?.lat,
      gps_lng: gpsData?.lng,
      gps_accuracy: gpsData?.accuracy,
      sync_status: 'pending',
    };

    setQueue(prev => [...prev, newScan]);
    
    // Try immediate sync if online
    if (isOnline) {
      syncScan(newScan);
    }

    return newScan.id;
  }, [isOnline]);

  const syncScan = async (scan: OfflineScan) => {
    if (!user?.id || !profile?.tenant_id) return;

    try {
      // Use RPC or direct insert depending on types availability
      const insertData = {
        tenant_id: profile.tenant_id,
        device_id: scan.device_id,
        scan_type: scan.scan_type,
        scan_data: scan.scan_data,
        scanned_by: user.id,
        scanned_at: scan.scanned_at,
        gps_lat: scan.gps_lat,
        gps_lng: scan.gps_lng,
        gps_accuracy: scan.gps_accuracy,
        sync_status: 'synced',
        synced_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('offline_scan_queue' as any)
        .insert(insertData as any);

      if (error) throw error;

      setQueue(prev => prev.map(s => 
        s.id === scan.id ? { ...s, sync_status: 'synced' as const } : s
      ));

      // Remove synced scans after a delay
      setTimeout(() => {
        setQueue(prev => prev.filter(s => s.id !== scan.id));
      }, 5000);

    } catch (error) {
      console.error('Failed to sync scan:', error);
      setQueue(prev => prev.map(s => 
        s.id === scan.id 
          ? { ...s, sync_status: 'failed' as const, sync_error: String(error) } 
          : s
      ));
    }
  };

  const syncQueue = async () => {
    if (isSyncing || !user?.id || !profile?.tenant_id) return;

    const pendingScans = queue.filter(s => s.sync_status === 'pending' || s.sync_status === 'failed');
    if (pendingScans.length === 0) return;

    setIsSyncing(true);

    try {
      for (const scan of pendingScans) {
        await syncScan(scan);
      }

      const syncedCount = queue.filter(s => s.sync_status === 'synced').length;
      if (syncedCount > 0) {
        toast({
          title: t('scanning.syncComplete', 'Sync Complete'),
          description: t('scanning.syncedScans', '{{count}} scans synced', { count: syncedCount }),
        });
      }
    } catch (error) {
      toast({
        title: t('scanning.syncError', 'Sync Error'),
        description: t('scanning.syncFailed', 'Some scans failed to sync'),
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const clearSynced = useCallback(() => {
    setQueue(prev => prev.filter(s => s.sync_status !== 'synced'));
  }, []);

  const retryFailed = useCallback(() => {
    setQueue(prev => prev.map(s => 
      s.sync_status === 'failed' ? { ...s, sync_status: 'pending' as const, sync_error: undefined } : s
    ));
    if (isOnline) {
      syncQueue();
    }
  }, [isOnline]);

  return {
    queue,
    isOnline,
    isSyncing,
    pendingCount: queue.filter(s => s.sync_status === 'pending').length,
    failedCount: queue.filter(s => s.sync_status === 'failed').length,
    addScan,
    syncQueue,
    clearSynced,
    retryFailed,
  };
}
