import { useEffect } from 'react';
import { addNotificationToHistory, playNotificationSound, NotificationSoundType } from '@/lib/notification-history';

export function useSwNotificationListener() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STORE_NOTIFICATION') {
        const { title, body, type } = event.data.notification;
        
        // Add to history
        addNotificationToHistory({
          title,
          body,
          type: type as NotificationSoundType || 'info',
        });
        
        // Play sound
        playNotificationSound(type as NotificationSoundType || 'info');
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);
}
