/**
 * Enhanced Offline Sync Hook with Conflict Resolution
 * Provides improved sync capabilities with conflict detection and auto-retry
 */

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './use-network-status';
import { offlineMutationQueue, type QueuedMutation } from '@/lib/offline-mutation-queue';
import { toast } from '@/hooks/use-toast';

export type ConflictType = 'version_mismatch' | 'concurrent_edit' | 'deleted' | 'server_error';

export interface SyncResult {
  success: boolean;
  conflictType?: ConflictType;
  serverData?: unknown;
  requiresManualResolve: boolean;
  errorMessage?: string;
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
  lastSyncAt: Date | null;
  nextRetryAt: Date | null;
}

const RETRY_INTERVALS = [5000, 15000, 30000, 60000, 120000]; // Progressive backoff

export function useOfflineSyncEnhanced() {
  const { isOnline } = useNetworkStatus();
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false,
    lastSyncAt: null,
    nextRetryAt: null,
  });
  const [conflicts, setConflicts] = useState<Array<{ mutation: QueuedMutation; conflict: SyncResult }>>([]);
  const [retryCount, setRetryCount] = useState(0);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && offlineMutationQueue.length > 0 && !syncProgress.inProgress) {
      syncPendingMutations();
    }
  }, [isOnline]);

  // Auto-retry with progressive backoff
  useEffect(() => {
    if (!isOnline || syncProgress.inProgress || offlineMutationQueue.length === 0) return;
    
    if (retryCount > 0 && retryCount < RETRY_INTERVALS.length) {
      const delay = RETRY_INTERVALS[retryCount - 1];
      const nextRetry = new Date(Date.now() + delay);
      
      setSyncProgress(prev => ({ ...prev, nextRetryAt: nextRetry }));
      
      const timer = setTimeout(() => {
        syncPendingMutations();
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [retryCount, isOnline, syncProgress.inProgress]);

  const syncPendingMutations = useCallback(async () => {
    if (!isOnline || syncProgress.inProgress) return;

    const mutations = offlineMutationQueue.getAll();
    if (mutations.length === 0) return;

    setSyncProgress({
      total: mutations.length,
      completed: 0,
      failed: 0,
      inProgress: true,
      lastSyncAt: null,
      nextRetryAt: null,
    });

    let completed = 0;
    let failed = 0;
    const newConflicts: Array<{ mutation: QueuedMutation; conflict: SyncResult }> = [];

    for (const mutation of mutations) {
      try {
        const result = await processMutation(mutation);
        
        if (result.success) {
          offlineMutationQueue.remove(mutation.id);
          completed++;
        } else if (result.requiresManualResolve) {
          newConflicts.push({ mutation, conflict: result });
          failed++;
        } else {
          // Transient error, will retry
          failed++;
        }
        
        setSyncProgress(prev => ({
          ...prev,
          completed,
          failed,
        }));
      } catch (error) {
        console.error('Sync error for mutation:', mutation.id, error);
        failed++;
      }
    }

    setSyncProgress(prev => ({
      ...prev,
      inProgress: false,
      lastSyncAt: new Date(),
    }));

    if (newConflicts.length > 0) {
      setConflicts(prev => [...prev, ...newConflicts]);
    }

    if (failed > 0 && completed < mutations.length) {
      setRetryCount(prev => prev + 1);
    } else {
      setRetryCount(0);
    }

    // Show toast with results
    if (completed > 0 || failed > 0) {
      toast({
        title: completed === mutations.length ? 'Sync complete' : 'Sync completed with issues',
        description: `${completed} synced, ${failed} failed`,
        variant: failed > 0 ? 'destructive' : 'default',
      });
    }

    return { completed, failed };
  }, [isOnline, syncProgress.inProgress]);

  const processMutation = async (mutation: QueuedMutation): Promise<SyncResult> => {
    if (!mutation.endpoint || !mutation.method) {
      // No endpoint defined, mark as success (will be handled by registered handler)
      return { success: true, requiresManualResolve: false };
    }

    try {
      const response = await fetch(mutation.endpoint, {
        method: mutation.method,
        headers: {
          'Content-Type': 'application/json',
          ...mutation.headers,
        },
        body: mutation.body ? JSON.stringify(mutation.body) : undefined,
      });

      if (response.ok) {
        return { success: true, requiresManualResolve: false };
      }

      // Handle specific error cases
      if (response.status === 409) {
        const serverData = await response.json().catch(() => null);
        return {
          success: false,
          conflictType: 'concurrent_edit',
          serverData,
          requiresManualResolve: true,
          errorMessage: 'Data was modified by another user',
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          conflictType: 'deleted',
          requiresManualResolve: true,
          errorMessage: 'Record no longer exists',
        };
      }

      if (response.status === 412) {
        return {
          success: false,
          conflictType: 'version_mismatch',
          requiresManualResolve: true,
          errorMessage: 'Version mismatch detected',
        };
      }

      // Server error - retry later
      return {
        success: false,
        conflictType: 'server_error',
        requiresManualResolve: false,
        errorMessage: `Server error: ${response.status}`,
      };
    } catch (error) {
      // Network error - retry later
      return {
        success: false,
        conflictType: 'server_error',
        requiresManualResolve: false,
        errorMessage: error instanceof Error ? error.message : 'Network error',
      };
    }
  };

  const resolveConflict = useCallback((mutationId: string, resolution: 'keep_local' | 'use_server' | 'discard') => {
    const conflictIndex = conflicts.findIndex(c => c.mutation.id === mutationId);
    if (conflictIndex === -1) return;

    const conflict = conflicts[conflictIndex];
    
    if (resolution === 'discard' || resolution === 'use_server') {
      offlineMutationQueue.remove(mutationId);
    }
    // If 'keep_local', the mutation stays in queue for next sync

    setConflicts(prev => prev.filter((_, i) => i !== conflictIndex));
  }, [conflicts]);

  const forceSyncNow = useCallback(() => {
    setRetryCount(0);
    return syncPendingMutations();
  }, [syncPendingMutations]);

  const clearAllPending = useCallback(() => {
    offlineMutationQueue.clear();
    setConflicts([]);
    setRetryCount(0);
    setSyncProgress(prev => ({
      ...prev,
      total: 0,
      completed: 0,
      failed: 0,
    }));
  }, []);

  return {
    isOnline,
    syncProgress,
    conflicts,
    pendingCount: offlineMutationQueue.length,
    syncPendingMutations: forceSyncNow,
    resolveConflict,
    clearAllPending,
    retryCount,
  };
}
