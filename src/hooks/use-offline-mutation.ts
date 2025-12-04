import { useCallback, useSyncExternalStore } from 'react';
import { offlineMutationQueue } from '@/lib/offline-mutation-queue';
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
  mutationFn: (variables: TVariables) => Promise<unknown>
) {
  const { isOnline } = useNetworkStatus();

  // Register the handler for replay
  registerMutationHandler(mutationKey, mutationFn as MutationHandler);

  const mutate = useCallback(
    async (variables: TVariables) => {
      if (isOnline) {
        return mutationFn(variables);
      }

      // Queue for later
      offlineMutationQueue.add(mutationKey, variables);
      toast({
        title: 'Saved offline',
        description: 'Your changes will be synced when you\'re back online.',
      });
      return Promise.resolve();
    },
    [isOnline, mutationKey, mutationFn]
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
 * Replay all queued mutations
 */
export async function replayQueuedMutations(): Promise<{ success: number; failed: number }> {
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
