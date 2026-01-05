import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    deferredInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

const DISMISS_KEY = 'pwa-install-dismissed-until';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const isIOS = typeof navigator !== 'undefined' && 
    /iPad|iPhone|iPod/.test(navigator.userAgent) && 
    !(window as any).MSStream;

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if (isInIframe) {
      setIsInstalled(false);
    } else {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      
      if (isStandalone) {
        setIsInstalled(true);
        return;
      }
    }

    // Check if prompt was already captured globally (before React loaded)
    if (window.deferredInstallPrompt) {
      setDeferredPrompt(window.deferredInstallPrompt);
      promptRef.current = window.deferredInstallPrompt;
      setIsReady(true);
    }

    // Check if dismissed
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      setIsDismissed(true);
    }

    // Listen for custom event from global capture
    const handlePwaAvailable = () => {
      if (window.deferredInstallPrompt) {
        setDeferredPrompt(window.deferredInstallPrompt);
        promptRef.current = window.deferredInstallPrompt;
        setIsReady(true);
      }
    };

    // Listen for beforeinstallprompt (fallback if global didn't catch it)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      promptRef.current = promptEvent;
      window.deferredInstallPrompt = promptEvent;
      setIsReady(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      promptRef.current = null;
      window.deferredInstallPrompt = null;
    };

    window.addEventListener('pwa-install-available', handlePwaAvailable);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Mark as ready even if no prompt (for iOS or browsers that don't support it)
    const readyTimer = setTimeout(() => setIsReady(true), 1000);

    return () => {
      window.removeEventListener('pwa-install-available', handlePwaAvailable);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(readyTimer);
    };
  }, [isInIframe]);

  const promptInstall = useCallback(async () => {
    // Check all possible sources for the prompt
    const prompt = deferredPrompt || promptRef.current || window.deferredInstallPrompt;
    if (!prompt) return false;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      
      // Clear all references after use
      setDeferredPrompt(null);
      promptRef.current = null;
      window.deferredInstallPrompt = null;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    }
  }, [deferredPrompt]);

  const dismissUntil = useCallback((days: number = 7) => {
    const until = new Date();
    until.setDate(until.getDate() + days);
    localStorage.setItem(DISMISS_KEY, until.toISOString());
    setIsDismissed(true);
  }, []);

  const clearDismiss = useCallback(() => {
    localStorage.removeItem(DISMISS_KEY);
    setIsDismissed(false);
  }, []);

  // Show install button if not installed and not dismissed
  const canInstall = !isInstalled && !isDismissed;
  const canPromptNatively = !!(deferredPrompt || promptRef.current || window.deferredInstallPrompt);

  return {
    canInstall,
    canPromptNatively,
    isInstalled,
    isIOS,
    isDismissed,
    isReady,
    promptInstall,
    dismissUntil,
    clearDismiss,
  };
}
