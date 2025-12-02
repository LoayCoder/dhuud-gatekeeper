import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIdleTimeoutOptions {
  idleTimeout?: number; // milliseconds
  warningThreshold?: number; // milliseconds before timeout to show warning
  onTimeout?: () => void;
  enabled?: boolean;
}

interface UseIdleTimeoutReturn {
  isIdle: boolean;
  isWarning: boolean;
  remainingTime: number; // seconds
  resetTimer: () => void;
}

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

export function useIdleTimeout({
  idleTimeout = 15 * 60 * 1000, // 15 minutes
  warningThreshold = 2 * 60 * 1000, // 2 minutes
  onTimeout,
  enabled = true,
}: UseIdleTimeoutOptions = {}): UseIdleTimeoutReturn {
  const [isIdle, setIsIdle] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(idleTimeout / 1000);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const startCountdown = useCallback(() => {
    const updateCountdown = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, (idleTimeout - elapsed) / 1000);
      setRemainingTime(Math.ceil(remaining));
      
      if (remaining <= 0) {
        clearTimers();
        setIsIdle(true);
        onTimeout?.();
      }
    };

    updateCountdown();
    countdownIntervalRef.current = setInterval(updateCountdown, 1000);
  }, [idleTimeout, onTimeout, clearTimers]);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    clearTimers();
    setIsIdle(false);
    setIsWarning(false);
    lastActivityRef.current = Date.now();
    setRemainingTime(idleTimeout / 1000);

    // Set warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      setIsWarning(true);
      startCountdown();
    }, idleTimeout - warningThreshold);

    // Set idle timeout
    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
      onTimeout?.();
    }, idleTimeout);
  }, [enabled, idleTimeout, warningThreshold, onTimeout, clearTimers, startCountdown]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Initialize timers
    resetTimer();

    // Add event listeners
    const handleActivity = () => {
      if (!isWarning) {
        resetTimer();
      }
    };

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, isWarning, resetTimer, clearTimers]);

  return {
    isIdle,
    isWarning,
    remainingTime,
    resetTimer,
  };
}
