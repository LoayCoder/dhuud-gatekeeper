import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from './use-network-status';
import { replayQueuedMutations, usePendingMutationsCount } from './use-offline-mutation';
import { toast } from '@/hooks/use-toast';

/**
 * Automatically refetches failed/stale queries when network comes back online
 * and replays queued mutations
 */
export function useOnlineRetry() {
  const queryClient = useQueryClient();
  const { isOnline, wasOffline } = useNetworkStatus();
  const pendingCount = usePendingMutationsCount();

  useEffect(() => {
    // When coming back online after being offline
    if (isOnline && wasOffline) {
      // Replay queued mutations first
      if (pendingCount > 0) {
        replayQueuedMutations().then(({ success, failed }) => {
          if (success > 0) {
            toast({
              title: 'Changes synced',
              description: `${success} pending change${success > 1 ? 's' : ''} saved successfully.`,
            });
          }
          if (failed > 0) {
            toast({
              title: 'Some changes failed',
              description: `${failed} change${failed > 1 ? 's' : ''} could not be saved. Please try again.`,
              variant: 'destructive',
            });
          }
        });
      }

      // Invalidate and refetch all queries that may have failed while offline
      queryClient.invalidateQueries({
        predicate: (query) => {
          // Refetch queries that are stale or have errors
          return query.state.status === 'error' || query.isStale();
        },
      });
    }
  }, [isOnline, wasOffline, queryClient, pendingCount]);
}
