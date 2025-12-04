import { useState, useEffect, useRef } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-dismiss "Back online" after 3 seconds
      timeoutRef.current = setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isOnline, wasOffline };
}
