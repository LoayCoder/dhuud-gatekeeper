import { useCallback, useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { offlineDataCache, CACHE_STORES } from '@/lib/offline-data-cache';
import { offlineMutationQueue } from '@/lib/offline-mutation-queue';
import { useCreatePTWPermit } from './use-ptw-permits';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const OFFLINE_PERMITS_KEY = 'offline-ptw-permits';
const FORM_PROGRESS_KEY = 'ptw-form-progress';

export interface OfflinePermit {
  localId: string;
  data: Record<string, unknown>;
  createdAt: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  syncError?: string;
}

/**
 * Hook for offline-capable PTW permit creation with background sync
 */
export function useOfflinePermitCreation() {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const createPermit = useCreatePTWPermit();
  const [pendingPermits, setPendingPermits] = useState<OfflinePermit[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending permits from cache on mount
  useEffect(() => {
    loadPendingPermits();
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingPermits.length > 0) {
      syncPendingPermits();
    }
  }, [isOnline]);

  const loadPendingPermits = useCallback(async () => {
    const cached = await offlineDataCache.get<OfflinePermit[]>(
      CACHE_STORES.PTW_PERMITS,
      OFFLINE_PERMITS_KEY
    );
    if (cached.data) {
      setPendingPermits(cached.data.filter(p => p.syncStatus !== 'synced'));
    }
  }, []);

  const savePendingPermits = useCallback(async (permits: OfflinePermit[]) => {
    await offlineDataCache.set(
      CACHE_STORES.PTW_PERMITS,
      OFFLINE_PERMITS_KEY,
      permits,
      { maxAge: 7 * 24 * 60 * 60 * 1000 } // Keep for 7 days
    );
    setPendingPermits(permits.filter(p => p.syncStatus !== 'synced'));
  }, []);

  const createOfflinePermit = useCallback(async (
    data: Record<string, unknown>
  ): Promise<{ success: boolean; localId?: string; error?: string }> => {
    // If online, submit directly
    if (isOnline) {
      try {
        await createPermit.mutateAsync(data as Parameters<typeof createPermit.mutateAsync>[0]);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    // Offline: Store locally
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const offlinePermit: OfflinePermit = {
      localId,
      data,
      createdAt: Date.now(),
      syncStatus: 'pending',
    };

    const updatedPermits = [...pendingPermits, offlinePermit];
    await savePendingPermits(updatedPermits);

    // Register background sync
    await offlineMutationQueue.add('ptw-permit-create', { localId, data }, {
      endpoint: '/ptw/permits',
      method: 'POST',
      body: data,
    });

    toast({
      title: t('ptw.offline.savedLocally', 'Permit Saved Locally'),
      description: t('ptw.offline.willSyncWhenOnline', 'Will sync automatically when back online'),
    });

    return { success: true, localId };
  }, [isOnline, createPermit, pendingPermits, savePendingPermits, t]);

  const syncPendingPermits = useCallback(async () => {
    if (isSyncing || !isOnline || pendingPermits.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;
    let failedCount = 0;

    const updatedPermits = await Promise.all(
      pendingPermits.map(async (permit) => {
        if (permit.syncStatus === 'synced') return permit;

        try {
          await createPermit.mutateAsync(
            permit.data as Parameters<typeof createPermit.mutateAsync>[0]
          );
          successCount++;
          return { ...permit, syncStatus: 'synced' as const };
        } catch (error) {
          failedCount++;
          return {
            ...permit,
            syncStatus: 'failed' as const,
            syncError: (error as Error).message,
          };
        }
      })
    );

    await savePendingPermits(updatedPermits);
    setIsSyncing(false);

    if (successCount > 0) {
      toast({
        title: t('ptw.offline.syncComplete', 'Sync Complete'),
        description: t('ptw.offline.permitsSynced', '{{count}} permit(s) synced successfully', { count: successCount }),
      });
    }

    if (failedCount > 0) {
      toast({
        title: t('ptw.offline.syncFailed', 'Sync Failed'),
        description: t('ptw.offline.permitsFailed', '{{count}} permit(s) failed to sync', { count: failedCount }),
        variant: 'destructive',
      });
    }
  }, [isSyncing, isOnline, pendingPermits, createPermit, savePendingPermits, t]);

  const removeFailedPermit = useCallback(async (localId: string) => {
    const updatedPermits = pendingPermits.filter(p => p.localId !== localId);
    await savePendingPermits(updatedPermits);
  }, [pendingPermits, savePendingPermits]);

  const retryFailedPermit = useCallback(async (localId: string) => {
    const permit = pendingPermits.find(p => p.localId === localId);
    if (!permit || !isOnline) return;

    const updatedPermits = pendingPermits.map(p =>
      p.localId === localId ? { ...p, syncStatus: 'syncing' as const } : p
    );
    await savePendingPermits(updatedPermits);

    try {
      await createPermit.mutateAsync(
        permit.data as Parameters<typeof createPermit.mutateAsync>[0]
      );
      const finalPermits = updatedPermits.map(p =>
        p.localId === localId ? { ...p, syncStatus: 'synced' as const } : p
      );
      await savePendingPermits(finalPermits);
      toast({
        title: t('ptw.offline.retrySuccess', 'Permit synced successfully'),
      });
    } catch (error) {
      const finalPermits = updatedPermits.map(p =>
        p.localId === localId
          ? { ...p, syncStatus: 'failed' as const, syncError: (error as Error).message }
          : p
      );
      await savePendingPermits(finalPermits);
    }
  }, [pendingPermits, isOnline, createPermit, savePendingPermits, t]);

  // Form progress persistence
  const saveFormProgress = useCallback(async (step: number, data: Record<string, unknown>) => {
    await offlineDataCache.set(
      CACHE_STORES.PTW_PERMITS,
      FORM_PROGRESS_KEY,
      { step, data, savedAt: Date.now() },
      { maxAge: 24 * 60 * 60 * 1000 } // Keep for 24 hours
    );
  }, []);

  const loadFormProgress = useCallback(async () => {
    const cached = await offlineDataCache.get<{ step: number; data: Record<string, unknown>; savedAt: number }>(
      CACHE_STORES.PTW_PERMITS,
      FORM_PROGRESS_KEY
    );
    return cached.data;
  }, []);

  const clearFormProgress = useCallback(async () => {
    await offlineDataCache.delete(CACHE_STORES.PTW_PERMITS, FORM_PROGRESS_KEY);
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingPermits,
    pendingCount: pendingPermits.length,
    createPermit: createOfflinePermit,
    syncPendingPermits,
    removeFailedPermit,
    retryFailedPermit,
    saveFormProgress,
    loadFormProgress,
    clearFormProgress,
    isPending: createPermit.isPending,
  };
}
