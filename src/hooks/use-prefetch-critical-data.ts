/**
 * Prefetch Critical Data Hook
 * Proactively caches essential data for offline use
 */

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from './use-network-status';
import { supabase } from '@/integrations/supabase/client';

// Critical data that should be prefetched for offline use
const CRITICAL_QUERIES = [
  { key: ['sites'], table: 'sites', select: 'id, name, name_ar, code, address' },
  { key: ['departments'], table: 'departments', select: 'id, name, name_ar, code' },
  { key: ['branches'], table: 'branches', select: 'id, name, name_ar, code, site_id' },
  { key: ['hsse-event-types'], table: 'hsse_event_types', select: 'id, name, name_ar, code, category' },
  { key: ['incident-categories'], table: 'incident_categories', select: 'id, name, name_ar, code' },
  { key: ['zones'], table: 'zones', select: 'id, zone_name, zone_code, zone_type' },
  { key: ['asset-categories'], table: 'asset_categories', select: 'id, name, name_ar, code' },
];

// IndexedDB for persistent cache
const DB_NAME = 'hsse-offline-cache';
const DB_VERSION = 1;
const STORE_NAME = 'critical-data';

export function usePrefetchCriticalData() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [lastPrefetchAt, setLastPrefetchAt] = useState<Date | null>(null);
  const [prefetchProgress, setPrefetchProgress] = useState({ current: 0, total: 0 });

  // Check network quality via Navigator API
  const connection = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
  const isSlowNetwork = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';

  // Auto-prefetch when coming online
  useEffect(() => {
    if (!isOnline || isPrefetching) return;
    
    const shouldPrefetch = isSlowNetwork || !lastPrefetchAt;
    
    if (shouldPrefetch) {
      prefetchAll();
    }
  }, [isOnline, isSlowNetwork]);

  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }, []);

  const saveToIndexedDB = useCallback(async (key: string, data: unknown) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          key,
          data,
          timestamp: Date.now(),
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      db.close();
    } catch (error) {
      console.warn('Failed to save to IndexedDB:', error);
    }
  }, [openDB]);

  const loadFromIndexedDB = useCallback(async (key: string): Promise<unknown | null> => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const result = await new Promise<unknown | null>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.data ?? null);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      return result;
    } catch (error) {
      console.warn('Failed to load from IndexedDB:', error);
      return null;
    }
  }, [openDB]);

  const prefetchQuery = useCallback(async (query: typeof CRITICAL_QUERIES[0]) => {
    try {
      const { data, error } = await supabase
        .from(query.table as any)
        .select(query.select)
        .limit(1000);
      
      if (error) throw error;
      
      // Cache in React Query
      queryClient.setQueryData(query.key, data);
      
      // Persist to IndexedDB
      await saveToIndexedDB(query.key.join('-'), data);
      
      return true;
    } catch (error) {
      console.warn(`Failed to prefetch ${query.table}:`, error);
      return false;
    }
  }, [queryClient, saveToIndexedDB]);

  const prefetchAll = useCallback(async () => {
    if (isPrefetching || !isOnline) return;
    
    setIsPrefetching(true);
    setPrefetchProgress({ current: 0, total: CRITICAL_QUERIES.length });
    
    let completed = 0;
    
    for (const query of CRITICAL_QUERIES) {
      await prefetchQuery(query);
      completed++;
      setPrefetchProgress({ current: completed, total: CRITICAL_QUERIES.length });
    }
    
    setLastPrefetchAt(new Date());
    setIsPrefetching(false);
  }, [isPrefetching, isOnline, prefetchQuery]);

  const getCachedData = useCallback(async <T>(queryKey: string[]): Promise<T | null> => {
    // First try React Query cache
    const cached = queryClient.getQueryData<T>(queryKey);
    if (cached) return cached;
    
    // Fall back to IndexedDB
    const indexed = await loadFromIndexedDB(queryKey.join('-'));
    if (indexed) {
      // Restore to React Query cache
      queryClient.setQueryData(queryKey, indexed);
      return indexed as T;
    }
    
    return null;
  }, [queryClient, loadFromIndexedDB]);

  const clearCache = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      db.close();
      
      // Also clear from React Query
      CRITICAL_QUERIES.forEach(q => {
        queryClient.removeQueries({ queryKey: q.key });
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }, [openDB, queryClient]);

  return {
    prefetchAll,
    getCachedData,
    clearCache,
    isPrefetching,
    prefetchProgress,
    lastPrefetchAt,
    isSlowNetwork,
    isOnline,
  };
}
