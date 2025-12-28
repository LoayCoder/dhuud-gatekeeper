import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './use-network-status';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface OfflineCheckpoint {
  id: string;
  patrol_id: string;
  checkpoint_id: string;
  captured_at: string;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  notes: string | null;
  photo_paths: string[] | null;
  sync_status: 'pending' | 'synced' | 'failed';
  sync_error?: string;
}

const STORAGE_KEY = 'offline-patrol-checkpoints';

function getDeviceId(): string {
  let deviceId = localStorage.getItem('patrol-device-id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('patrol-device-id', deviceId);
  }
  return deviceId;
}

export function useOfflinePatrolQueue() {
  const { isOnline } = useNetworkStatus();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [queue, setQueue] = useState<OfflineCheckpoint[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Persist queue to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  const addCheckpoint = useCallback(
    (checkpoint: Omit<OfflineCheckpoint, 'id' | 'sync_status'>) => {
      const newCheckpoint: OfflineCheckpoint = {
        ...checkpoint,
        id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        sync_status: 'pending',
      };

      setQueue((prev) => [...prev, newCheckpoint]);
      return newCheckpoint.id;
    },
    []
  );

  const syncCheckpoint = useCallback(
    async (checkpoint: OfflineCheckpoint): Promise<boolean> => {
      if (!profile?.tenant_id) return false;

      try {
        // First, try to sync to the offline_patrol_checkpoints table
        const { error } = await supabase.from('offline_patrol_checkpoints').insert({
          tenant_id: profile.tenant_id,
          patrol_id: checkpoint.patrol_id,
          checkpoint_id: checkpoint.checkpoint_id,
          guard_id: user?.id,
          device_id: getDeviceId(),
          captured_at: checkpoint.captured_at,
          gps_lat: checkpoint.gps_lat,
          gps_lng: checkpoint.gps_lng,
          gps_accuracy: checkpoint.gps_accuracy,
          notes: checkpoint.notes,
          photo_paths: checkpoint.photo_paths,
          sync_status: 'synced',
          synced_at: new Date().toISOString(),
        });

        if (error) throw error;

        // Also try to log the checkpoint in patrol_checkpoint_logs
        await supabase.from('patrol_checkpoint_logs').insert({
          tenant_id: profile.tenant_id,
          patrol_id: checkpoint.patrol_id,
          checkpoint_id: checkpoint.checkpoint_id,
          guard_id: user?.id,
          checked_at: checkpoint.captured_at,
          gps_lat: checkpoint.gps_lat,
          gps_lng: checkpoint.gps_lng,
          gps_accuracy: checkpoint.gps_accuracy,
          notes: checkpoint.notes,
        });

        return true;
      } catch (error) {
        console.error('Failed to sync checkpoint:', error);
        return false;
      }
    },
    [profile]
  );

  const syncQueue = useCallback(async () => {
    if (isSyncing || !isOnline || queue.length === 0) return;

    setIsSyncing(true);
    let syncedCount = 0;
    let failedCount = 0;

    const pendingCheckpoints = queue.filter((c) => c.sync_status === 'pending');

    for (const checkpoint of pendingCheckpoints) {
      const success = await syncCheckpoint(checkpoint);

      setQueue((prev) =>
        prev.map((c) =>
          c.id === checkpoint.id
            ? {
                ...c,
                sync_status: success ? 'synced' : 'failed',
                sync_error: success ? undefined : 'Sync failed',
              }
            : c
        )
      );

      if (success) {
        syncedCount++;
      } else {
        failedCount++;
      }
    }

    // Remove successfully synced items from queue
    setQueue((prev) => prev.filter((c) => c.sync_status !== 'synced'));

    setIsSyncing(false);

    if (syncedCount > 0) {
      toast({
        title: 'Patrol data synced',
        description: `${syncedCount} checkpoint(s) synced successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['security-patrols'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-checkpoint-logs'] });
    }

    if (failedCount > 0) {
      toast({
        title: 'Sync incomplete',
        description: `${failedCount} checkpoint(s) failed to sync.`,
        variant: 'destructive',
      });
    }
  }, [isSyncing, isOnline, queue, syncCheckpoint, queryClient]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && queue.some((c) => c.sync_status === 'pending')) {
      syncQueue();
    }
  }, [isOnline, queue, syncQueue]);

  const clearSynced = useCallback(() => {
    setQueue((prev) => prev.filter((c) => c.sync_status !== 'synced'));
  }, []);

  const retryFailed = useCallback(() => {
    setQueue((prev) =>
      prev.map((c) =>
        c.sync_status === 'failed' ? { ...c, sync_status: 'pending' as const } : c
      )
    );
  }, []);

  const pendingCount = queue.filter((c) => c.sync_status === 'pending').length;
  const failedCount = queue.filter((c) => c.sync_status === 'failed').length;

  return {
    queue,
    addCheckpoint,
    syncQueue,
    clearSynced,
    retryFailed,
    isSyncing,
    isOnline,
    pendingCount,
    failedCount,
  };
}
