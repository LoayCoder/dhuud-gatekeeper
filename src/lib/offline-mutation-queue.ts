type QueuedMutation = {
  id: string;
  timestamp: number;
  mutationKey: string;
  variables: unknown;
};

const STORAGE_KEY = 'offline-mutation-queue';

class OfflineMutationQueue {
  private queue: QueuedMutation[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
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

  add(mutationKey: string, variables: unknown): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const mutation: QueuedMutation = {
      id,
      timestamp: Date.now(),
      mutationKey,
      variables,
    };
    this.queue.push(mutation);
    this.saveToStorage();
    this.notifyListeners();
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

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const offlineMutationQueue = new OfflineMutationQueue();
