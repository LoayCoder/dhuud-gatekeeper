import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { logUserActivity, getSessionDurationSeconds, clearSessionTracking } from '@/lib/activity-logger';

interface SessionTimeoutContextType {
  isWarning: boolean;
  remainingTime: number;
  resetTimer: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTimeout = async () => {
    const duration = getSessionDurationSeconds();
    await logUserActivity({ 
      eventType: 'session_timeout',
      sessionDurationSeconds: duration ?? undefined,
    });
    clearSessionTracking();
    await supabase.auth.signOut();
    toast({
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity.',
      variant: 'destructive',
    });
    navigate('/login');
  };

  const { isWarning, remainingTime, resetTimer } = useIdleTimeout({
    idleTimeout: 15 * 60 * 1000, // 15 minutes
    warningThreshold: 2 * 60 * 1000, // 2 minutes
    onTimeout: handleTimeout,
    enabled: isAuthenticated,
  });

  return (
    <SessionTimeoutContext.Provider value={{ isWarning, remainingTime, resetTimer }}>
      {children}
    </SessionTimeoutContext.Provider>
  );
}

export function useSessionTimeout() {
  const context = useContext(SessionTimeoutContext);
  if (context === undefined) {
    throw new Error('useSessionTimeout must be used within a SessionTimeoutProvider');
  }
  return context;
}
