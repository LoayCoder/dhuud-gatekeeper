import { useEffect, useState, useCallback } from 'react';

interface WindowControlsOverlay {
  isSupported: boolean;
  isVisible: boolean;
  titlebarAreaRect: DOMRect | null;
  isPWAMode: boolean;
}

/**
 * Hook to detect and handle Window Controls Overlay (WCO) for desktop PWAs.
 * WCO allows the app to extend into the title bar area for a more native feel.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window_Controls_Overlay_API
 */
export function useWindowControlsOverlay(): WindowControlsOverlay {
  const [isSupported, setIsSupported] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [titlebarAreaRect, setTitlebarAreaRect] = useState<DOMRect | null>(null);
  const [isPWAMode, setIsPWAMode] = useState(false);

  useEffect(() => {
    // Check if running as installed PWA
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as any).standalone === true;
    
    setIsPWAMode(isStandalone);

    // Check if Window Controls Overlay API is available
    const wco = (navigator as any).windowControlsOverlay;
    const supported = !!wco;
    setIsSupported(supported);

    if (!supported) return;

    // Get initial visibility state
    setIsVisible(wco.visible);

    // Get initial titlebar area
    if (wco.getTitlebarAreaRect) {
      try {
        const rect = wco.getTitlebarAreaRect();
        setTitlebarAreaRect(rect);
      } catch (e) {
        console.debug('[WCO] Failed to get titlebar rect:', e);
      }
    }

    // Listen for geometry changes
    const handleGeometryChange = (event: any) => {
      setIsVisible(event.visible);
      if (event.titlebarAreaRect) {
        setTitlebarAreaRect(event.titlebarAreaRect);
      }
    };

    wco.addEventListener('geometrychange', handleGeometryChange);

    return () => {
      wco.removeEventListener('geometrychange', handleGeometryChange);
    };
  }, []);

  return {
    isSupported,
    isVisible,
    titlebarAreaRect,
    isPWAMode,
  };
}

/**
 * CSS Custom Properties for WCO safe areas
 * Use these in your CSS/Tailwind for proper spacing
 */
export function useWCOCSSProperties() {
  const { isVisible, titlebarAreaRect } = useWindowControlsOverlay();

  useEffect(() => {
    const root = document.documentElement;

    if (isVisible && titlebarAreaRect) {
      root.style.setProperty('--titlebar-area-x', `${titlebarAreaRect.x}px`);
      root.style.setProperty('--titlebar-area-y', `${titlebarAreaRect.y}px`);
      root.style.setProperty('--titlebar-area-width', `${titlebarAreaRect.width}px`);
      root.style.setProperty('--titlebar-area-height', `${titlebarAreaRect.height}px`);
      root.style.setProperty('--titlebar-area-inset', `env(titlebar-area-height, 0px)`);
    } else {
      root.style.removeProperty('--titlebar-area-x');
      root.style.removeProperty('--titlebar-area-y');
      root.style.removeProperty('--titlebar-area-width');
      root.style.removeProperty('--titlebar-area-height');
      root.style.removeProperty('--titlebar-area-inset');
    }
  }, [isVisible, titlebarAreaRect]);
}
