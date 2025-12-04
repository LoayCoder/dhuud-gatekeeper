import { useState, useEffect, useRef } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Start dismiss animation after 2.5 seconds
      timeoutRef.current = setTimeout(() => {
        setIsDismissing(true);
        // Hide completely after animation (300ms)
        dismissTimeoutRef.current = setTimeout(() => {
          setWasOffline(false);
          setIsDismissing(false);
        }, 300);
      }, 2500);
    };

    const handleOffline = () => {
      // Clear any pending timeouts
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      setIsOnline(false);
      setWasOffline(true);
      setIsDismissing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    };
  }, []);

  return { isOnline, wasOffline, isDismissing };
}
