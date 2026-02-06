import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OneSignal from 'react-onesignal';
import { logger } from '@/lib/logger';
import { useOneSignal } from '@/contexts/OneSignalContext';

/**
 * Listens for OneSignal notification click events and navigates
 * to the deep-linked route if one is present in additionalData.
 *
 * Must be rendered inside a <BrowserRouter>.
 */
export function useOneSignalClickHandler() {
  const navigate = useNavigate();
  const { isInitialized } = useOneSignal();

  useEffect(() => {
    if (!isInitialized) return;

    const handleClick = (event: { notification: { additionalData?: Record<string, unknown> } }) => {
      try {
        const route = event?.notification?.additionalData?.route as string | undefined;
        if (route && typeof route === 'string' && route.startsWith('/')) {
          logger.debug(`OneSignal: Deep link navigation to ${route}`);
          navigate(route);
        }
      } catch (error) {
        logger.error('OneSignal: Click handler error:', error);
      }
    };

    OneSignal.Notifications.addEventListener('click', handleClick);

    return () => {
      try {
        OneSignal.Notifications.removeEventListener('click', handleClick);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [navigate, isInitialized]);
}
