import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from './use-network-status';

/**
 * Automatically refetches failed/stale queries when network comes back online
 */
export function useOnlineRetry() {
  const queryClient = useQueryClient();
  const { isOnline, wasOffline } = useNetworkStatus();

  useEffect(() => {
    // When coming back online after being offline, refetch failed queries
    if (isOnline && wasOffline) {
      // Invalidate and refetch all queries that may have failed while offline
      queryClient.invalidateQueries({
        predicate: (query) => {
          // Refetch queries that are stale or have errors
          return query.state.status === 'error' || query.isStale();
        },
      });
    }
  }, [isOnline, wasOffline, queryClient]);
}
