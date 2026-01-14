import { useState, useEffect, useCallback, useRef } from 'react';

interface VersionInfo {
  version: string;
  buildDate: string;
  releaseNotes: string[];
  priority: 'normal' | 'important' | 'critical';
}

interface AppUpdateState {
  hasUpdate: boolean;
  isChecking: boolean;
  currentVersion: string | null;
  newVersion: string | null;
  releaseNotes: string[];
  priority: 'normal' | 'important' | 'critical';
  isIOS: boolean;
  isPWA: boolean;
  dismissCount: number;
  lastDismissed: number | null;
  checkForUpdates: () => Promise<boolean>;
  applyUpdate: () => void;
  dismissUpdate: (remindLater?: boolean) => void;
}

const VERSION_STORAGE_KEY = 'app-current-version';
const DISMISS_COUNT_KEY = 'app-update-dismiss-count';
const DISMISS_TIME_KEY = 'app-update-dismiss-time';
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
const REMIND_LATER_DURATION = 60 * 60 * 1000; // 1 hour
const DONT_REMIND_TODAY_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hook for comprehensive app update detection across Web, PWA, and iOS
 */
export function useAppUpdateCheck(): AppUpdateState {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string[]>([]);
  const [priority, setPriority] = useState<'normal' | 'important' | 'critical'>('normal');
  const [dismissCount, setDismissCount] = useState(0);
  const [lastDismissed, setLastDismissed] = useState<number | null>(null);
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as { standalone?: boolean }).standalone === true;

  // Load stored state
  useEffect(() => {
    const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
    const storedDismissCount = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10);
    const storedDismissTime = parseInt(localStorage.getItem(DISMISS_TIME_KEY) || '0', 10);
    
    if (storedVersion) {
      setCurrentVersion(storedVersion);
    }
    setDismissCount(storedDismissCount);
    setLastDismissed(storedDismissTime || null);
  }, []);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if (isChecking) return false;
    
    setIsChecking(true);
    
    try {
      // Check if enough time has passed since last dismissal
      const storedDismissTime = parseInt(localStorage.getItem(DISMISS_TIME_KEY) || '0', 10);
      const storedDismissCount = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10);
      
      if (storedDismissTime > 0) {
        const timeSinceDismiss = Date.now() - storedDismissTime;
        // If critical (3+ dismissals), re-show after 1 hour, otherwise respect the dismissal
        if (storedDismissCount < 3 && timeSinceDismiss < REMIND_LATER_DURATION) {
          setIsChecking(false);
          return false;
        }
      }

      // Fetch version manifest
      const response = await fetch(`/version.json?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        setIsChecking(false);
        return false;
      }
      
      const versionInfo: VersionInfo = await response.json();
      const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
      
      // Compare versions
      if (!storedVersion) {
        // First time - store current version
        localStorage.setItem(VERSION_STORAGE_KEY, versionInfo.version);
        setCurrentVersion(versionInfo.version);
        setIsChecking(false);
        return false;
      }
      
      if (versionInfo.version !== storedVersion) {
        setHasUpdate(true);
        setNewVersion(versionInfo.version);
        setReleaseNotes(versionInfo.releaseNotes || []);
        setPriority(versionInfo.priority || 'normal');
        setIsChecking(false);
        return true;
      }
      
      // Also check for Service Worker updates
      if ('serviceWorker' in navigator && !isIOS) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.update();
          
          if (registration.waiting) {
            setHasUpdate(true);
            setNewVersion(versionInfo.version);
            setReleaseNotes(versionInfo.releaseNotes || []);
            setPriority(versionInfo.priority || 'normal');
            setIsChecking(false);
            return true;
          }
        } catch (swError) {
          console.warn('[Update Check] SW update check failed:', swError);
        }
      }
      
      setIsChecking(false);
      return false;
    } catch (error) {
      console.error('[Update Check] Failed:', error);
      setIsChecking(false);
      return false;
    }
  }, [isChecking, isIOS]);

  const applyUpdate = useCallback(() => {
    // Clear dismiss state
    localStorage.removeItem(DISMISS_COUNT_KEY);
    localStorage.removeItem(DISMISS_TIME_KEY);
    
    if ('serviceWorker' in navigator && !isIOS) {
      // Standard SW update flow
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
      
      // Listen for controller change then reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (newVersion) {
          localStorage.setItem(VERSION_STORAGE_KEY, newVersion);
        }
        window.location.reload();
      });
      
      // Fallback: reload after short delay
      setTimeout(() => {
        if (newVersion) {
          localStorage.setItem(VERSION_STORAGE_KEY, newVersion);
        }
        window.location.reload();
      }, 1000);
    } else {
      // iOS PWA or no SW - just reload and update stored version
      if (newVersion) {
        localStorage.setItem(VERSION_STORAGE_KEY, newVersion);
      }
      window.location.reload();
    }
  }, [isIOS, newVersion]);

  const dismissUpdate = useCallback((dontRemindToday = false) => {
    const newDismissCount = dismissCount + 1;
    const dismissTime = Date.now() + (dontRemindToday ? DONT_REMIND_TODAY_DURATION : 0);
    
    setDismissCount(newDismissCount);
    setLastDismissed(dismissTime);
    setHasUpdate(false);
    
    localStorage.setItem(DISMISS_COUNT_KEY, String(newDismissCount));
    localStorage.setItem(DISMISS_TIME_KEY, String(dismissTime));
  }, [dismissCount]);

  // Initial check and periodic checks
  useEffect(() => {
    // Check on mount (with small delay to let app initialize)
    const initialCheck = setTimeout(() => {
      checkForUpdates();
    }, 3000);

    // Periodic check every 30 minutes
    checkIntervalRef.current = setInterval(() => {
      checkForUpdates();
    }, CHECK_INTERVAL);

    return () => {
      clearTimeout(initialCheck);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkForUpdates]);

  // Check on visibility change (when user returns to app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdates]);

  // Check when coming back online
  useEffect(() => {
    const handleOnline = () => {
      checkForUpdates();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [checkForUpdates]);

  return {
    hasUpdate,
    isChecking,
    currentVersion,
    newVersion,
    releaseNotes,
    priority,
    isIOS,
    isPWA,
    dismissCount,
    lastDismissed,
    checkForUpdates,
    applyUpdate,
    dismissUpdate,
  };
}
