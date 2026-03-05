import { useState, useEffect, useCallback } from 'react';
import {
  NotificationHistoryItem,
  getNotificationHistory,
  addNotificationToHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearNotificationHistory,
  getUnreadCount,
} from '@/lib/notification-history';

export function useNotificationHistory() {
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Initial load
    setHistory(getNotificationHistory());
    setUnreadCount(getUnreadCount());

    // Listen for updates
    const handleUpdate = (event: CustomEvent<NotificationHistoryItem[]>) => {
      setHistory(event.detail);
      setUnreadCount(event.detail.filter(item => !item.read).length);
    };

    window.addEventListener('notification-history-updated', handleUpdate as EventListener);
    
    return () => {
      window.removeEventListener('notification-history-updated', handleUpdate as EventListener);
    };
  }, []);

  const addNotification = useCallback((
    notification: Omit<NotificationHistoryItem, 'id' | 'timestamp' | 'read'>
  ) => {
    return addNotificationToHistory(notification);
  }, []);

  const markAsRead = useCallback((id: string) => {
    markNotificationAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    markAllNotificationsAsRead();
  }, []);

  const clearHistory = useCallback(() => {
    clearNotificationHistory();
  }, []);

  return {
    history,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearHistory,
  };
}
