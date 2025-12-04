export type QueuedMutation = {
  id: string;
  timestamp: number;
  mutationKey: string;
  variables: unknown;
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

const STORAGE_KEY = 'offline-mutation-queue';
const SYNC_TAG = 'offline-mutations-sync';

class OfflineMutationQueue {
  private queue: QueuedMutation[] = [];
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
    } catch {
      this.queue = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // Storage full or unavailable
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
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

  clear() {
    this.queue = [];
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
