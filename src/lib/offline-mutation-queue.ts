export type QueuedMutation = {
  id: string;
  timestamp: number;
  mutationKey: string;
  variables: unknown;
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  retryCount?: number;
};

export type FailedMutation = QueuedMutation & {
  error?: string;
  failedAt: number;
  failureReason: 'permanent' | 'max_retries';
};

const STORAGE_KEY = 'offline-mutation-queue';
const FAILED_STORAGE_KEY = 'offline-failed-mutations';
const SYNC_TAG = 'offline-mutations-sync';
const MAX_RETRIES = 3;

class OfflineMutationQueue {
  private queue: QueuedMutation[] = [];
  private failedQueue: FailedMutation[] = [];
  private listeners: Set<() => void> = new Set();
  private backgroundSyncSupported: boolean = false;

  constructor() {
    this.loadFromStorage();
    this.checkBackgroundSyncSupport();
    this.setupServiceWorkerListener();
  }

  private async checkBackgroundSyncSupport() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        this.backgroundSyncSupported = 'sync' in registration;
      } catch {
        this.backgroundSyncSupported = false;
      }
    }
  }

  private setupServiceWorkerListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        // Handle request for mutations from service worker
        if (event.data?.type === 'GET_MUTATIONS' && event.ports[0]) {
          event.ports[0].postMessage({ mutations: this.getAll() });
        }
        
        // Handle successful mutation removal
        if (event.data?.type === 'MUTATION_SUCCESS') {
          this.remove(event.data.id);
        }

        // Handle permanent failure (400s) - Poison Pill
        if (event.data?.type === 'MUTATION_FAILED_PERMANENT') {
          this.handlePermanentFailure(event.data.id, event.data.error);
        }

        // Handle retryable failure (500s/Network)
        if (event.data?.type === 'MUTATION_FAILED_RETRYABLE') {
          this.handleRetryableFailure(event.data.id, event.data.error);
        }
        
        // Handle sync complete notification
        if (event.data?.type === 'SYNC_COMPLETE') {
          this.notifyListeners();
        }
      });
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }

      const storedFailed = localStorage.getItem(FAILED_STORAGE_KEY);
      if (storedFailed) {
        this.failedQueue = JSON.parse(storedFailed);
      }
    } catch {
      this.queue = [];
      this.failedQueue = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      localStorage.setItem(FAILED_STORAGE_KEY, JSON.stringify(this.failedQueue));
    } catch {
      // Storage full or unavailable
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  private handlePermanentFailure(id: string, error?: string) {
    const mutation = this.queue.find((m) => m.id === id);
    if (mutation) {
      this.moveToFailed(mutation, 'permanent', error);
    }
  }

  private handleRetryableFailure(id: string, error?: string) {
    const index = this.queue.findIndex((m) => m.id === id);
    if (index === -1) return;

    const mutation = this.queue[index];
    const currentRetries = mutation.retryCount || 0;

    if (currentRetries >= MAX_RETRIES) {
      this.moveToFailed(mutation, 'max_retries', error);
    } else {
      // Increment retry count
      this.queue[index] = {
        ...mutation,
        retryCount: currentRetries + 1
      };
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  private moveToFailed(mutation: QueuedMutation, reason: 'permanent' | 'max_retries', error?: string) {
    const failedMutation: FailedMutation = {
      ...mutation,
      failedAt: Date.now(),
      failureReason: reason,
      error
    };

    this.failedQueue.push(failedMutation);
    // Limit failed queue size to prevent storage issues (keep last 50)
    if (this.failedQueue.length > 50) {
      this.failedQueue = this.failedQueue.slice(-50);
    }

    // Remove from main queue
    this.queue = this.queue.filter((m) => m.id !== mutation.id);

    this.saveToStorage();
    this.notifyListeners();
  }

  private async registerBackgroundSync() {
    if (!this.backgroundSyncSupported) return false;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(SYNC_TAG);
      return true;
    } catch (error) {
      console.warn('Background sync registration failed:', error);
      return false;
    }
  }

  async add(mutationKey: string, variables: unknown, options?: {
    endpoint?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const mutation: QueuedMutation = {
      id,
      timestamp: Date.now(),
      mutationKey,
      variables,
      retryCount: 0,
      ...options,
    };
    this.queue.push(mutation);
    this.saveToStorage();
    this.notifyListeners();
    
    // Try to register background sync
    await this.registerBackgroundSync();
    
    return id;
  }

  remove(id: string) {
    this.queue = this.queue.filter((m) => m.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  getAll(): QueuedMutation[] {
    return [...this.queue];
  }

  getFailed(): FailedMutation[] {
    return [...this.failedQueue];
  }

  clear() {
    this.queue = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  clearFailed() {
    this.failedQueue = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  get length() {
    return this.queue.length;
  }

  get isBackgroundSyncSupported() {
    return this.backgroundSyncSupported;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Manually trigger sync via service worker
  async triggerSync(): Promise<{ success: number; failed: number }> {
    return new Promise((resolve) => {
      if (!('serviceWorker' in navigator)) {
        resolve({ success: 0, failed: 0 });
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          navigator.serviceWorker.removeEventListener('message', handleMessage);
          resolve({ success: event.data.success, failed: event.data.failed });
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      navigator.serviceWorker.controller?.postMessage({ type: 'TRIGGER_SYNC' });

      // Timeout fallback
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
        resolve({ success: 0, failed: 0 });
      }, 30000);
    });
  }
}

export const offlineMutationQueue = new OfflineMutationQueue();
