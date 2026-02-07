/**
 * IDEMPOTENCY & DEDUPLICATION LAYER
 *
 * Prevents duplicate notification delivery during:
 * 1. Client-side retries (network failures)
 * 2. Realtime subscription re-triggers
 * 3. Race conditions between multiple tabs
 * 4. Edge function retry logic
 *
 * Strategy:
 * - Every ActionEvent has a unique eventId
 * - Before processing, check if eventId was already processed
 * - Uses a combination of in-memory cache + localStorage for client-side
 * - Server-side: DB-based dedup via unique constraint on eventId
 */

import { logger } from '@/lib/logger';

const DEDUP_STORAGE_KEY = 'notification-dedup-events';
const DEDUP_MAX_ENTRIES = 500;
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache for fast lookups
const memoryCache = new Map<string, number>();

interface DedupEntry {
  eventId: string;
  processedAt: number;
}

/**
 * Checks if an event has already been processed.
 * Returns true if it IS a duplicate (should be skipped).
 */
export function isDuplicateEvent(eventId: string): boolean {
  // 1. Check memory cache first (fastest)
  if (memoryCache.has(eventId)) {
    logger.debug(`[Idempotency] Duplicate detected in memory: ${eventId}`);
    return true;
  }

  // 2. Check localStorage
  try {
    const stored = localStorage.getItem(DEDUP_STORAGE_KEY);
    if (stored) {
      const entries: DedupEntry[] = JSON.parse(stored);
      const found = entries.find(e => e.eventId === eventId);
      if (found) {
        // Also put in memory for faster subsequent checks
        memoryCache.set(eventId, found.processedAt);
        logger.debug(`[Idempotency] Duplicate detected in storage: ${eventId}`);
        return true;
      }
    }
  } catch {
    // localStorage unavailable (SSR, privacy mode) — fall through
  }

  return false;
}

/**
 * Marks an event as processed.
 * Call this AFTER successful delivery.
 */
export function markEventProcessed(eventId: string): void {
  const now = Date.now();

  // 1. Add to memory
  memoryCache.set(eventId, now);

  // 2. Persist to localStorage
  try {
    const stored = localStorage.getItem(DEDUP_STORAGE_KEY);
    let entries: DedupEntry[] = stored ? JSON.parse(stored) : [];

    // Add the new entry
    entries.push({ eventId, processedAt: now });

    // Prune expired entries
    const cutoff = now - DEDUP_TTL_MS;
    entries = entries.filter(e => e.processedAt > cutoff);

    // Cap at max entries (remove oldest)
    if (entries.length > DEDUP_MAX_ENTRIES) {
      entries = entries.slice(entries.length - DEDUP_MAX_ENTRIES);
    }

    localStorage.setItem(DEDUP_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable — memory-only dedup still works
  }
}

/**
 * Generates a deterministic event ID from event properties.
 * This ensures the same logical event always gets the same ID,
 * even if triggered independently by multiple tabs.
 *
 * Format: {eventType}:{tenantId}:{entityId}:{timestamp_bucket}
 * Timestamp bucket = rounded to nearest 5 seconds (prevents micro-timing dedup misses)
 */
export function generateEventId(
  eventType: string,
  tenantId: string,
  entityId: string,
  timestamp?: string
): string {
  const ts = timestamp ? new Date(timestamp).getTime() : Date.now();
  const bucket = Math.floor(ts / 5000) * 5000; // 5-second buckets
  return `${eventType}:${tenantId}:${entityId}:${bucket}`;
}

/**
 * Cleans up expired entries from both memory and storage.
 * Call periodically (e.g., on app load) to prevent unbounded growth.
 */
export function cleanupDedupCache(): void {
  const cutoff = Date.now() - DEDUP_TTL_MS;

  // Clean memory
  for (const [key, timestamp] of memoryCache.entries()) {
    if (timestamp < cutoff) {
      memoryCache.delete(key);
    }
  }

  // Clean storage
  try {
    const stored = localStorage.getItem(DEDUP_STORAGE_KEY);
    if (stored) {
      const entries: DedupEntry[] = JSON.parse(stored);
      const cleaned = entries.filter(e => e.processedAt > cutoff);
      localStorage.setItem(DEDUP_STORAGE_KEY, JSON.stringify(cleaned));
    }
  } catch {
    // Ignore
  }
}
