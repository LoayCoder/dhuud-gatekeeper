/**
 * Offline Data Cache using IndexedDB
 * Provides structured data caching for critical HSSE data
 */

const DB_NAME = 'dhuud-offline-cache';
const DB_VERSION = 1;

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheConfig {
  staleTime: number;      // Time in ms before data is considered stale
  maxAge: number;         // Max time in ms to keep data
  backgroundSync: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  staleTime: 5 * 60 * 1000,      // 5 minutes
  maxAge: 24 * 60 * 60 * 1000,   // 24 hours
  backgroundSync: true,
};

// Store names for different data types
export const CACHE_STORES = {
  PROFILE: 'profile',
  INCIDENTS: 'incidents',
  INSPECTIONS: 'inspections',
  ASSETS: 'assets',
  REFERENCE_DATA: 'reference_data',
  PATROL_ROUTES: 'patrol_routes',
  SECURITY_ZONES: 'security_zones',
  // PWA Enhancement stores
  PTW_PERMITS: 'ptw_permits',
  CONTRACTORS: 'contractors',
  GATE_ENTRIES: 'gate_entries',
  PENDING_ACTIONS: 'pending_actions',
  DASHBOARD_STATS: 'dashboard_stats',
} as const;

export type CacheStoreName = typeof CACHE_STORES[keyof typeof CACHE_STORES];

class OfflineDataCache {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores for each cache type
        Object.values(CACHE_STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'key' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('expiresAt', 'expiresAt', { unique: false });
          }
        });
      };
    });

    return this.dbPromise;
  }

  async set<T>(
    storeName: CacheStoreName,
    key: string,
    data: T,
    config: Partial<CacheConfig> = {}
  ): Promise<void> {
    const { maxAge } = { ...DEFAULT_CONFIG, ...config };

    try {
      const db = await this.openDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + maxAge,
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Failed to cache data in ${storeName}:`, error);
    }
  }

  async get<T>(
    storeName: CacheStoreName,
    key: string,
    config: Partial<CacheConfig> = {}
  ): Promise<{ data: T | null; isStale: boolean; isMiss: boolean }> {
    const { staleTime } = { ...DEFAULT_CONFIG, ...config };

    try {
      const db = await this.openDB();
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      const entry = await new Promise<CacheEntry<T> | undefined>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!entry) {
        return { data: null, isStale: true, isMiss: true };
      }

      const now = Date.now();

      // Check if expired
      if (now > entry.expiresAt) {
        await this.delete(storeName, key);
        return { data: null, isStale: true, isMiss: true };
      }

      // Check if stale
      const isStale = now - entry.timestamp > staleTime;

      return { data: entry.data, isStale, isMiss: false };
    } catch (error) {
      console.error(`Failed to get cached data from ${storeName}:`, error);
      return { data: null, isStale: true, isMiss: true };
    }
  }

  async delete(storeName: CacheStoreName, key: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Failed to delete cached data from ${storeName}:`, error);
    }
  }

  async getAll<T>(storeName: CacheStoreName): Promise<CacheEntry<T>[]> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      const entries = await new Promise<CacheEntry<T>[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      // Filter out expired entries
      const now = Date.now();
      return entries.filter((entry) => entry.expiresAt > now);
    } catch (error) {
      console.error(`Failed to get all cached data from ${storeName}:`, error);
      return [];
    }
  }

  async clear(storeName: CacheStoreName): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Failed to clear cache store ${storeName}:`, error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      const db = await this.openDB();
      const storeNames = Object.values(CACHE_STORES);

      for (const storeName of storeNames) {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        await new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    } catch (error) {
      console.error('Failed to clear all cache stores:', error);
    }
  }

  async cleanupExpired(): Promise<number> {
    let cleaned = 0;

    try {
      const db = await this.openDB();
      const now = Date.now();

      for (const storeName of Object.values(CACHE_STORES)) {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const index = store.index('expiresAt');

        const range = IDBKeyRange.upperBound(now);
        const request = index.openCursor(range);

        await new Promise<void>((resolve) => {
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              cursor.delete();
              cleaned++;
              cursor.continue();
            } else {
              resolve();
            }
          };
          request.onerror = () => resolve();
        });
      }
    } catch (error) {
      console.error('Failed to cleanup expired cache entries:', error);
    }

    return cleaned;
  }
}

export const offlineDataCache = new OfflineDataCache();

// Cleanup expired entries periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    offlineDataCache.cleanupExpired().then((count) => {
      if (count > 0) {
        console.log(`Cleaned up ${count} expired cache entries`);
      }
    });
  }, 60 * 60 * 1000); // Every hour
}
