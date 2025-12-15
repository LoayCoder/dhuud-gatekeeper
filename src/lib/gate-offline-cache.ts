/**
 * IndexedDB-based offline cache for Gate Guard Dashboard
 * Provides structured caching for gate entries, visitors, and worker verifications
 */

const DB_NAME = 'dhuud-gate-cache';
const DB_VERSION = 1;

interface CachedEntry {
  id: string;
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

interface PendingEntry {
  id: string;
  type: 'entry' | 'exit' | 'worker_verification';
  data: unknown;
  createdAt: number;
  retryCount: number;
}

// Cache durations in milliseconds
const CACHE_DURATIONS = {
  activeVisitors: 5 * 60 * 1000, // 5 minutes
  gateEntries: 24 * 60 * 60 * 1000, // 24 hours
  workerVerifications: 30 * 60 * 1000, // 30 minutes
  pendingEntries: 7 * 24 * 60 * 60 * 1000, // 7 days
};

class GateOfflineCache {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for cached data
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'id' });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // Store for pending mutations (offline queue)
        if (!db.objectStoreNames.contains('pending')) {
          const pendingStore = db.createObjectStore('pending', { keyPath: 'id' });
          pendingStore.createIndex('createdAt', 'createdAt', { unique: false });
          pendingStore.createIndex('type', 'type', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Cache active visitors list
   */
  async cacheActiveVisitors(visitors: unknown[]): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');

      const entry: CachedEntry = {
        id: 'active-visitors',
        data: visitors,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATIONS.activeVisitors,
      };

      await this.promisifyRequest(store.put(entry));
    } catch (error) {
      console.error('[GateCache] Failed to cache active visitors:', error);
    }
  }

  /**
   * Get cached active visitors
   */
  async getActiveVisitors(): Promise<unknown[] | null> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');

      const entry = await this.promisifyRequest<CachedEntry>(store.get('active-visitors'));
      
      if (entry && entry.expiresAt > Date.now()) {
        return entry.data as unknown[];
      }
      return null;
    } catch (error) {
      console.error('[GateCache] Failed to get active visitors:', error);
      return null;
    }
  }

  /**
   * Cache today's gate entries
   */
  async cacheGateEntries(entries: unknown[]): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');

      const entry: CachedEntry = {
        id: 'gate-entries-today',
        data: entries,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATIONS.gateEntries,
      };

      await this.promisifyRequest(store.put(entry));
    } catch (error) {
      console.error('[GateCache] Failed to cache gate entries:', error);
    }
  }

  /**
   * Get cached gate entries
   */
  async getGateEntries(): Promise<unknown[] | null> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');

      const entry = await this.promisifyRequest<CachedEntry>(store.get('gate-entries-today'));
      
      if (entry && entry.expiresAt > Date.now()) {
        return entry.data as unknown[];
      }
      return null;
    } catch (error) {
      console.error('[GateCache] Failed to get gate entries:', error);
      return null;
    }
  }

  /**
   * Cache worker QR verification result
   */
  async cacheWorkerVerification(workerId: string, result: unknown): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');

      const entry: CachedEntry = {
        id: `worker-${workerId}`,
        data: result,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATIONS.workerVerifications,
      };

      await this.promisifyRequest(store.put(entry));
    } catch (error) {
      console.error('[GateCache] Failed to cache worker verification:', error);
    }
  }

  /**
   * Get cached worker verification
   */
  async getWorkerVerification(workerId: string): Promise<unknown | null> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');

      const entry = await this.promisifyRequest<CachedEntry>(store.get(`worker-${workerId}`));
      
      if (entry && entry.expiresAt > Date.now()) {
        return entry.data;
      }
      return null;
    } catch (error) {
      console.error('[GateCache] Failed to get worker verification:', error);
      return null;
    }
  }

  /**
   * Add pending entry for offline sync
   */
  async addPendingEntry(type: PendingEntry['type'], data: unknown): Promise<string> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('pending', 'readwrite');
      const store = tx.objectStore('pending');

      const id = `${type}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const entry: PendingEntry = {
        id,
        type,
        data,
        createdAt: Date.now(),
        retryCount: 0,
      };

      await this.promisifyRequest(store.add(entry));
      return id;
    } catch (error) {
      console.error('[GateCache] Failed to add pending entry:', error);
      throw error;
    }
  }

  /**
   * Get all pending entries for sync
   */
  async getPendingEntries(): Promise<PendingEntry[]> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('pending', 'readonly');
      const store = tx.objectStore('pending');

      return await this.promisifyRequest<PendingEntry[]>(store.getAll());
    } catch (error) {
      console.error('[GateCache] Failed to get pending entries:', error);
      return [];
    }
  }

  /**
   * Remove pending entry after successful sync
   */
  async removePendingEntry(id: string): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('pending', 'readwrite');
      const store = tx.objectStore('pending');

      await this.promisifyRequest(store.delete(id));
    } catch (error) {
      console.error('[GateCache] Failed to remove pending entry:', error);
    }
  }

  /**
   * Increment retry count for failed sync
   */
  async incrementRetryCount(id: string): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('pending', 'readwrite');
      const store = tx.objectStore('pending');

      const entry = await this.promisifyRequest<PendingEntry>(store.get(id));
      if (entry) {
        entry.retryCount += 1;
        await this.promisifyRequest(store.put(entry));
      }
    } catch (error) {
      console.error('[GateCache] Failed to increment retry count:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const index = store.index('expiresAt');

      const range = IDBKeyRange.upperBound(Date.now());
      const entries = await this.promisifyRequest<CachedEntry[]>(index.getAll(range));

      for (const entry of entries) {
        await this.promisifyRequest(store.delete(entry.id));
      }
    } catch (error) {
      console.error('[GateCache] Failed to clear expired cache:', error);
    }
  }

  /**
   * Check if we have any cached data available
   */
  async hasCachedData(): Promise<boolean> {
    try {
      const visitors = await this.getActiveVisitors();
      return visitors !== null;
    } catch {
      return false;
    }
  }

  private promisifyRequest<T>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const gateOfflineCache = new GateOfflineCache();
