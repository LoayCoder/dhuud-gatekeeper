import { useEffect } from 'react';
import { 
  addNotificationToHistory, 
  playNotificationSound, 
  NotificationSoundType,
  isCategoryEnabled 
} from '@/lib/notification-history';
import { logger } from '@/lib/logger';

export function useSwNotificationListener() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STORE_NOTIFICATION') {
        const { title, body, type } = event.data.notification;
        const notificationType = (type as NotificationSoundType) || 'info';
        
        // Check if this category is enabled
        if (!isCategoryEnabled(notificationType)) {
          logger.debug(`Notification category "${notificationType}" is disabled, skipping`);
          return;
        }
        
        // Add to history
        addNotificationToHistory({
          title,
          body,
          type: notificationType,
        });
        
        // Play sound
        playNotificationSound(notificationType);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);
}
