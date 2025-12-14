import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { offlineDataCache, CACHE_STORES, CacheConfig } from '@/lib/offline-data-cache';
import { useNetworkStatus } from './use-network-status';

type CacheStoreName = typeof CACHE_STORES[keyof typeof CACHE_STORES];

interface UseOfflineDataOptions extends Partial<CacheConfig> {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Hook that provides offline-first data fetching with IndexedDB caching
 * Uses a Stale-While-Revalidate strategy
 */
export function useOfflineData<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  storeName: CacheStoreName,
  cacheKey: string,
  options: UseOfflineDataOptions = {}
) {
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const [cachedData, setCachedData] = useState<T | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);

  const { staleTime = 5 * 60 * 1000, maxAge = 24 * 60 * 60 * 1000, enabled = true } = options;

  // Load cached data on mount
  useEffect(() => {
    let mounted = true;

    const loadCache = async () => {
      try {
        const { data, isMiss } = await offlineDataCache.get<T>(storeName, cacheKey, {
          staleTime,
          maxAge,
        });

        if (mounted && !isMiss && data !== null) {
          setCachedData(data);
        }
      } catch (error) {
        console.error('Error loading from cache:', error);
      } finally {
        if (mounted) {
          setIsLoadingCache(false);
        }
      }
    };

    loadCache();

    return () => {
      mounted = false;
    };
  }, [storeName, cacheKey, staleTime, maxAge]);

  // Wrapper query function that caches results
  const wrappedQueryFn = useCallback(async (): Promise<T> => {
    try {
      const data = await queryFn();

      // Cache the fresh data
      await offlineDataCache.set(storeName, cacheKey, data, { staleTime, maxAge });

      return data;
    } catch (error) {
      // If offline and we have cached data, use it
      if (!isOnline && cachedData !== null) {
        return cachedData;
      }

      // Try to get from cache as fallback
      const { data: fallbackData, isMiss } = await offlineDataCache.get<T>(storeName, cacheKey);

      if (!isMiss && fallbackData !== null) {
        return fallbackData;
      }

      throw error;
    }
  }, [queryFn, storeName, cacheKey, staleTime, maxAge, isOnline, cachedData]);

  // Use React Query with offline support
  const query = useQuery({
    queryKey,
    queryFn: wrappedQueryFn,
    enabled: enabled && !isLoadingCache,
    staleTime,
    initialData: cachedData ?? undefined,
  });

  // Update cache when data changes
  useEffect(() => {
    if (query.data) {
      offlineDataCache.set(storeName, cacheKey, query.data, { staleTime, maxAge });
    }
  }, [query.data, storeName, cacheKey, staleTime, maxAge]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (isOnline) {
      await queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient, queryKey, isOnline]);

  // Clear cache for this key
  const clearCache = useCallback(async () => {
    await offlineDataCache.delete(storeName, cacheKey);
  }, [storeName, cacheKey]);

  return {
    ...query,
    data: query.data ?? cachedData,
    isLoadingCache,
    isOffline: !isOnline,
    refresh,
    clearCache,
    hasCachedData: cachedData !== null,
  };
}

/**
 * Hook to prefetch and cache data for offline use
 */
export function useOfflinePrefetch() {
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();

  const prefetchAndCache = useCallback(
    async <T>(
      queryKey: string[],
      queryFn: () => Promise<T>,
      storeName: CacheStoreName,
      cacheKey: string,
      options: Partial<CacheConfig> = {}
    ) => {
      if (!isOnline) return;

      try {
        const data = await queryClient.fetchQuery({
          queryKey,
          queryFn,
          staleTime: options.staleTime ?? 5 * 60 * 1000,
        });

        await offlineDataCache.set(storeName, cacheKey, data, options);

        return data;
      } catch (error) {
        console.error('Failed to prefetch and cache:', error);
      }
    },
    [isOnline, queryClient]
  );

  return { prefetchAndCache };
}

/**
 * Hook to sync cached data when coming back online
 */
export function useOfflineSync() {
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOnline) {
      // Invalidate all queries to refresh data when back online
      setIsSyncing(true);
      queryClient.invalidateQueries().finally(() => {
        setIsSyncing(false);
      });
    }
  }, [isOnline, queryClient]);

  return { isSyncing };
}
