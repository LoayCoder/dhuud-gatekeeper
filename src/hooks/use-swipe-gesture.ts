import { useRef, useCallback } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // minimum distance to trigger swipe
  allowedTime?: number; // max time for swipe gesture
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  allowedTime = 300,
}: SwipeConfig) {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    const elapsedTime = Date.now() - touchStartTime.current;

    // Only trigger swipe if:
    // 1. Horizontal movement is greater than threshold
    // 2. Horizontal movement is greater than vertical (prevent triggering on scroll)
    // 3. Gesture completed within allowed time
    if (
      elapsedTime <= allowedTime &&
      Math.abs(deltaX) >= threshold &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      }
    }
  }, [onSwipeLeft, onSwipeRight, threshold, allowedTime]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}
