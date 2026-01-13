/**
 * Cached Session Hook
 * 
 * Provides IndexedDB-based session caching for offline access.
 * Caches user profile, role, and MFA status to allow authenticated
 * users to access the app offline without re-authentication prompts.
 */

import { logger } from '@/lib/logger';

const DB_NAME = 'dhuud-session-cache';
const DB_VERSION = 1;
const STORE_NAME = 'session';
const SESSION_KEY = 'current_session';

// Default cache duration: 7 days
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface CachedSessionProfile {
  full_name: string | null;
  avatar_url: string | null;
  tenant_id: string;
  preferred_language: string | null;
  assigned_branch_id: string | null;
  assigned_site_id: string | null;
  assigned_department_id: string | null;
  contractor_company_name: string | null;
  is_deleted?: boolean;
  is_active?: boolean;
}

export interface CachedSessionData {
  userId: string;
  email: string;
  profile: CachedSessionProfile;
  userRole: 'admin' | 'user';
  mfaEnabled: boolean;
  tenantMfaVerified: boolean;
  currentTenantId: string;
  cachedAt: number;
  expiresAt: number;
}

class SessionCache {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('Failed to open session cache DB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Cache session data to IndexedDB
   */
  async cacheSession(data: Omit<CachedSessionData, 'cachedAt' | 'expiresAt'>, maxAgeMs: number = DEFAULT_MAX_AGE_MS): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const now = Date.now();
      const entry = {
        key: SESSION_KEY,
        data: {
          ...data,
          cachedAt: now,
          expiresAt: now + maxAgeMs,
        } as CachedSessionData,
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      logger.debug('Session cached successfully');
    } catch (error) {
      logger.error('Failed to cache session:', error);
    }
  }

  /**
   * Get cached session from IndexedDB
   */
  async getCachedSession(): Promise<CachedSessionData | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const entry = await new Promise<{ key: string; data: CachedSessionData } | undefined>((resolve, reject) => {
        const request = store.get(SESSION_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!entry) {
        return null;
      }

      const now = Date.now();
      const sessionData = entry.data;

      // Check if expired
      if (now > sessionData.expiresAt) {
        await this.clearSession();
        return null;
      }

      return sessionData;
    } catch (error) {
      logger.error('Failed to get cached session:', error);
      return null;
    }
  }

  /**
   * Clear cached session from IndexedDB
   */
  async clearSession(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(SESSION_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      logger.debug('Session cache cleared');
    } catch (error) {
      logger.error('Failed to clear session cache:', error);
    }
  }

  /**
   * Check if cached session is valid (exists and not expired)
   */
  async isSessionCacheValid(userId?: string): Promise<boolean> {
    try {
      const cached = await this.getCachedSession();
      if (!cached) return false;

      // If userId provided, verify it matches
      if (userId && cached.userId !== userId) {
        return false;
      }

      const now = Date.now();
      return now < cached.expiresAt;
    } catch (error) {
      logger.error('Failed to validate session cache:', error);
      return false;
    }
  }

  /**
   * Update specific fields in cached session (e.g., after profile update)
   */
  async updateCachedProfile(updates: Partial<CachedSessionProfile>): Promise<void> {
    try {
      const cached = await this.getCachedSession();
      if (!cached) return;

      await this.cacheSession({
        userId: cached.userId,
        email: cached.email,
        profile: { ...cached.profile, ...updates },
        userRole: cached.userRole,
        mfaEnabled: cached.mfaEnabled,
        tenantMfaVerified: cached.tenantMfaVerified,
        currentTenantId: cached.currentTenantId,
      }, cached.expiresAt - cached.cachedAt);

      logger.debug('Session cache updated');
    } catch (error) {
      logger.error('Failed to update session cache:', error);
    }
  }
}

// Singleton instance
export const sessionCache = new SessionCache();

/**
 * React hook for session caching operations
 */
export function useCachedSession() {
  return {
    cacheSession: sessionCache.cacheSession.bind(sessionCache),
    getCachedSession: sessionCache.getCachedSession.bind(sessionCache),
    clearSession: sessionCache.clearSession.bind(sessionCache),
    isSessionCacheValid: sessionCache.isSessionCacheValid.bind(sessionCache),
    updateCachedProfile: sessionCache.updateCachedProfile.bind(sessionCache),
  };
}
