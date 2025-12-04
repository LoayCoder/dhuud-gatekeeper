import { useCallback, useSyncExternalStore } from 'react';
import { offlineMutationQueue, type QueuedMutation } from '@/lib/offline-mutation-queue';
import { useNetworkStatus } from './use-network-status';
import { toast } from '@/hooks/use-toast';

type MutationHandler = (variables: unknown) => Promise<unknown>;

const mutationHandlers = new Map<string, MutationHandler>();

/**
 * Register a mutation handler that can be replayed when back online
 */
export function registerMutationHandler(key: string, handler: MutationHandler) {
  mutationHandlers.set(key, handler);
}

/**
 * Hook for mutations that queue when offline and replay when online
 */
export function useOfflineMutation<TVariables>(
  mutationKey: string,
  mutationFn: (variables: TVariables) => Promise<unknown>,
  options?: {
    endpoint?: string;
    method?: string;
    headers?: Record<string, string>;
  }
) {
  const { isOnline } = useNetworkStatus();

  // Register the handler for replay
  registerMutationHandler(mutationKey, mutationFn as MutationHandler);

  const mutate = useCallback(
    async (variables: TVariables) => {
      if (isOnline) {
        return mutationFn(variables);
      }

      // Queue for later with background sync support
      await offlineMutationQueue.add(mutationKey, variables, {
        endpoint: options?.endpoint,
        method: options?.method,
        headers: options?.headers,
        body: variables,
      });
      
      toast({
        title: 'Saved offline',
        description: offlineMutationQueue.isBackgroundSyncSupported
          ? "Your changes will sync automatically in the background."
          : "Your changes will be synced when you're back online.",
      });
      return Promise.resolve();
    },
    [isOnline, mutationKey, mutationFn, options]
  );

  return { mutate, isOnline };
}

/**
 * Hook to get pending mutations count
 */
export function usePendingMutationsCount() {
  return useSyncExternalStore(
    offlineMutationQueue.subscribe.bind(offlineMutationQueue),
    () => offlineMutationQueue.length
  );
}

/**
 * Check if background sync is supported
 */
export function useBackgroundSyncSupported() {
  return useSyncExternalStore(
    offlineMutationQueue.subscribe.bind(offlineMutationQueue),
    () => offlineMutationQueue.isBackgroundSyncSupported
  );
}

/**
 * Replay all queued mutations (falls back to manual replay if background sync unavailable)
 */
export async function replayQueuedMutations(): Promise<{ success: number; failed: number }> {
  // Try background sync first if supported
  if (offlineMutationQueue.isBackgroundSyncSupported) {
    return offlineMutationQueue.triggerSync();
  }

  // Fall back to manual replay
  const mutations = offlineMutationQueue.getAll();
  let success = 0;
  let failed = 0;

  for (const mutation of mutations) {
    const handler = mutationHandlers.get(mutation.mutationKey);
    if (handler) {
      try {
        await handler(mutation.variables);
        offlineMutationQueue.remove(mutation.id);
        success++;
      } catch {
        failed++;
      }
    } else {
      // No handler registered, remove stale mutation
      offlineMutationQueue.remove(mutation.id);
    }
  }

  return { success, failed };
}
