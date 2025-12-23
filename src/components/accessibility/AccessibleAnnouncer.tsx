import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';

type AnnouncementPriority = 'polite' | 'assertive';

interface Announcement {
  message: string;
  priority: AnnouncementPriority;
  id: number;
}

interface AnnouncerContextType {
  announce: (message: string, priority?: AnnouncementPriority) => void;
}

const AnnouncerContext = createContext<AnnouncerContextType | null>(null);

let announcementId = 0;

/**
 * Provider component that manages accessible announcements via ARIA live regions.
 * Wrap your app with this to enable the useAnnounce hook.
 */
export function AccessibleAnnouncerProvider({ children }: { children: ReactNode }) {
  const [politeAnnouncement, setPoliteAnnouncement] = useState<Announcement | null>(null);
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState<Announcement | null>(null);

  const announce = useCallback((message: string, priority: AnnouncementPriority = 'polite') => {
    const announcement: Announcement = {
      message,
      priority,
      id: ++announcementId,
    };

    if (priority === 'assertive') {
      setAssertiveAnnouncement(announcement);
    } else {
      setPoliteAnnouncement(announcement);
    }

    // Clear announcement after a delay to allow for re-announcements of same message
    setTimeout(() => {
      if (priority === 'assertive') {
        setAssertiveAnnouncement(null);
      } else {
        setPoliteAnnouncement(null);
      }
    }, 1000);
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      
      {/* Polite live region - for non-urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeAnnouncement?.message}
      </div>
      
      {/* Assertive live region - for urgent updates */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveAnnouncement?.message}
      </div>
    </AnnouncerContext.Provider>
  );
}

/**
 * Hook to announce messages to screen readers
 * 
 * @example
 * const { announce } = useAnnounce();
 * 
 * // Polite announcement (default) - waits for screen reader to finish
 * announce('Form saved successfully');
 * 
 * // Assertive announcement - interrupts screen reader
 * announce('Error: Connection lost', 'assertive');
 */
export function useAnnounce() {
  const context = useContext(AnnouncerContext);
  
  if (!context) {
    // Return a no-op if used outside provider (graceful degradation)
    return {
      announce: (message: string, priority?: AnnouncementPriority) => {
        console.debug('[Announcer] No provider found, announcement skipped:', message);
      }
    };
  }
  
  return context;
}

/**
 * Hook to announce network status changes to screen readers
 */
export function useNetworkStatusAnnouncer() {
  const { announce } = useAnnounce();
  const [wasOffline, setWasOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      if (wasOffline) {
        announce('Connection restored. You are back online.', 'polite');
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      announce('Connection lost. You are now offline.', 'assertive');
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [announce, wasOffline]);
}

/**
 * Hook to announce page/route changes to screen readers
 */
export function useRouteAnnouncer(title: string) {
  const { announce } = useAnnounce();

  useEffect(() => {
    if (title) {
      // Small delay to ensure page content is ready
      const timeoutId = setTimeout(() => {
        announce(`Navigated to ${title}`, 'polite');
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [title, announce]);
}
