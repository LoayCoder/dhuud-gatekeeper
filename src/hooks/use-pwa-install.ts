import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
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

  // Detect if running in iframe (e.g., Lovable preview)
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    // If running in iframe, definitely NOT installed as standalone PWA
    if (isInIframe) {
      setIsInstalled(false);
    } else {
      // Only check standalone mode if NOT in iframe
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      
      if (isStandalone) {
        setIsInstalled(true);
        return;
      }
    }

    // Check if dismissed
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      setIsDismissed(true);
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      promptRef.current = promptEvent;
      setIsReady(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      promptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Mark as ready even if no prompt (for iOS or browsers that don't support it)
    const readyTimer = setTimeout(() => setIsReady(true), 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(readyTimer);
    };
  }, [isInIframe]);

  const promptInstall = useCallback(async () => {
    const prompt = deferredPrompt || promptRef.current;
    if (!prompt) return false;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      promptRef.current = null;
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
  // Even without deferredPrompt, we can show instructions
  const canInstall = !isInstalled && !isDismissed;
  const canPromptNatively = !!(deferredPrompt || promptRef.current);

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
