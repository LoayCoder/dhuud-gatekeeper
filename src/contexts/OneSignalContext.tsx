import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { logger } from '@/lib/logger';

interface OneSignalContextType {
  isInitialized: boolean;
  isSupported: boolean;
  permissionState: 'default' | 'granted' | 'denied';
  requestPermission: () => Promise<void>;
  loginUser: (externalId: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  addTags: (tags: Record<string, string>) => Promise<void>;
}

const OneSignalContext = createContext<OneSignalContextType | undefined>(undefined);

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '';

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionState, setPermissionState] = useState<'default' | 'granted' | 'denied'>('default');
  const initAttempted = useRef(false);

  // Initialize OneSignal
  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    if (!ONESIGNAL_APP_ID) {
      logger.warn('OneSignal: VITE_ONESIGNAL_APP_ID is not set. Skipping initialization.');
      setIsSupported(false);
      return;
    }

    if (!('serviceWorker' in navigator)) {
      logger.warn('OneSignal: Service workers not supported.');
      setIsSupported(false);
      return;
    }

    const initOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: import.meta.env.DEV,
          serviceWorkerPath: 'OneSignalSDKWorker.js',
        });

        setIsInitialized(true);
        logger.debug('OneSignal: Initialized successfully.');

        // Read initial permission state
        const browserPerm = 'Notification' in window ? Notification.permission : 'default';
        setPermissionState(browserPerm === 'denied' ? 'denied' : OneSignal.Notifications.permission ? 'granted' : 'default');

        // Listen for permission changes
        OneSignal.Notifications.addEventListener('permissionChange', (granted: boolean) => {
          setPermissionState(granted ? 'granted' : 'denied');
          logger.debug(`OneSignal: Permission changed to ${granted ? 'granted' : 'denied'}`);
        });
      } catch (error) {
        logger.error('OneSignal: Initialization failed:', error);
        setIsSupported(false);
      }
    };

    initOneSignal();
  }, []);

  // Sync browser Notification API permission as well
  useEffect(() => {
    if (!isInitialized) return;
    if ('Notification' in window) {
      const browserPerm = Notification.permission;
      if (browserPerm === 'denied') {
        setPermissionState('denied');
      }
    }
  }, [isInitialized]);

  const requestPermission = useCallback(async () => {
    if (!isInitialized) {
      logger.warn('OneSignal: Cannot request permission - not initialized.');
      return;
    }
    try {
      await OneSignal.Notifications.requestPermission();
      const granted = OneSignal.Notifications.permission;
      setPermissionState(granted ? 'granted' : 'denied');
    } catch (error) {
      logger.error('OneSignal: Permission request failed:', error);
    }
  }, [isInitialized]);

  const loginUser = useCallback(async (externalId: string) => {
    if (!isInitialized) {
      logger.warn('OneSignal: Cannot login - not initialized.');
      return;
    }
    try {
      await OneSignal.login(externalId);
      logger.debug(`OneSignal: User logged in with external ID: ${externalId.substring(0, 8)}...`);
    } catch (error) {
      logger.error('OneSignal: Login failed:', error);
    }
  }, [isInitialized]);

  const logoutUser = useCallback(async () => {
    if (!isInitialized) return;
    try {
      await OneSignal.logout();
      logger.debug('OneSignal: User logged out.');
    } catch (error) {
      logger.error('OneSignal: Logout failed:', error);
    }
  }, [isInitialized]);

  const addTags = useCallback(async (tags: Record<string, string>) => {
    if (!isInitialized) {
      logger.warn('OneSignal: Cannot add tags - not initialized.');
      return;
    }
    try {
      await OneSignal.User.addTags(tags);
      logger.debug('OneSignal: Tags added:', Object.keys(tags));
    } catch (error) {
      logger.error('OneSignal: Failed to add tags:', error);
    }
  }, [isInitialized]);

  return (
    <OneSignalContext.Provider
      value={{
        isInitialized,
        isSupported,
        permissionState,
        requestPermission,
        loginUser,
        logoutUser,
        addTags,
      }}
    >
      {children}
    </OneSignalContext.Provider>
  );
}

export function useOneSignal() {
  const context = useContext(OneSignalContext);
  if (context === undefined) {
    throw new Error('useOneSignal must be used within a OneSignalProvider');
  }
  return context;
}
