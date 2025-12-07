// Notification history storage utility

export interface NotificationHistoryItem {
  id: string;
  title: string;
  body?: string;
  type: 'sync' | 'update' | 'info' | 'error' | 'urgent';
  timestamp: number;
  read: boolean;
}

const STORAGE_KEY = 'notification-history';
const MAX_HISTORY_ITEMS = 50;

export function getNotificationHistory(): NotificationHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addNotificationToHistory(
  notification: Omit<NotificationHistoryItem, 'id' | 'timestamp' | 'read'>
): NotificationHistoryItem {
  const history = getNotificationHistory();
  const newItem: NotificationHistoryItem = {
    ...notification,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    read: false,
  };
  
  const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  
  // Dispatch custom event for real-time updates
  window.dispatchEvent(new CustomEvent('notification-history-updated', { detail: updated }));
  
  return newItem;
}

export function markNotificationAsRead(id: string): void {
  const history = getNotificationHistory();
  const updated = history.map(item => 
    item.id === id ? { ...item, read: true } : item
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('notification-history-updated', { detail: updated }));
}

export function markAllNotificationsAsRead(): void {
  const history = getNotificationHistory();
  const updated = history.map(item => ({ ...item, read: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('notification-history-updated', { detail: updated }));
}

export function clearNotificationHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('notification-history-updated', { detail: [] }));
}

export function getUnreadCount(): number {
  return getNotificationHistory().filter(item => !item.read).length;
}

// Sound management
export type NotificationSoundType = 'sync' | 'update' | 'info' | 'error' | 'urgent';
export type SoundOption = 'default' | 'chime' | 'bell' | 'ping' | 'urgent' | 'none';

const SOUND_SETTINGS_KEY = 'notification-sounds';
const CATEGORY_PREFS_KEY = 'notification-category-prefs';

export interface SoundSettings {
  sync: SoundOption;
  update: SoundOption;
  info: SoundOption;
  error: SoundOption;
  urgent: SoundOption;
}

export interface CategoryPreferences {
  sync: boolean;
  update: boolean;
  info: boolean;
  error: boolean;
  urgent: boolean;
}

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  sync: 'default',
  update: 'chime',
  info: 'ping',
  error: 'bell',
  urgent: 'urgent',
};

const DEFAULT_CATEGORY_PREFS: CategoryPreferences = {
  sync: true,
  update: true,
  info: true,
  error: true,
  urgent: true,
};

export function getSoundSettings(): SoundSettings {
  try {
    const stored = localStorage.getItem(SOUND_SETTINGS_KEY);
    return stored ? { ...DEFAULT_SOUND_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SOUND_SETTINGS;
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
}

export function setSoundSettings(settings: Partial<SoundSettings>): void {
  const current = getSoundSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(updated));
}

export function getCategoryPreferences(): CategoryPreferences {
  try {
    const stored = localStorage.getItem(CATEGORY_PREFS_KEY);
    return stored ? { ...DEFAULT_CATEGORY_PREFS, ...JSON.parse(stored) } : DEFAULT_CATEGORY_PREFS;
  } catch {
    return DEFAULT_CATEGORY_PREFS;
  }
}

export function setCategoryPreferences(prefs: Partial<CategoryPreferences>): void {
  const current = getCategoryPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem(CATEGORY_PREFS_KEY, JSON.stringify(updated));
}

export function isCategoryEnabled(type: NotificationSoundType): boolean {
  return getCategoryPreferences()[type];
}

// Send push notification with category check
export async function sendPushNotification(
  title: string,
  body: string,
  type: NotificationSoundType = 'info'
): Promise<boolean> {
  // Check if category is enabled
  if (!isCategoryEnabled(type)) {
    console.log(`Notification category "${type}" is disabled, skipping push`);
    return false;
  }

  // Check if notifications are supported and granted
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.log('Push notifications not available or not granted');
    // Still add to history
    addNotificationToHistory({ title, body, type });
    return false;
  }

  try {
    // Play sound
    playNotificationSound(type);
    
    // Add to history
    addNotificationToHistory({ title, body, type });
    
    // Show browser notification
    const notification = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag: `${type}-${Date.now()}`,
      requireInteraction: type === 'error' || type === 'urgent',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

// Audio context for playing sounds
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playNotificationSound(type: NotificationSoundType): void {
  const settings = getSoundSettings();
  const soundOption = settings[type];
  
  if (soundOption === 'none') return;
  
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different sound profiles
    switch (soundOption) {
      case 'chime':
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'bell':
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
        break;
      case 'ping':
        oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
        break;
      case 'urgent':
        // Two-tone urgent alert
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.3);
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.45);
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.6);
        break;
      default: // 'default'
        oscillator.frequency.setValueAtTime(440, ctx.currentTime);
        oscillator.frequency.setValueAtTime(550, ctx.currentTime + 0.1);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
    }
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
}
