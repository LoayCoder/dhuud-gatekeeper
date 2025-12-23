import React, { createContext, useContext, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { logUserActivity, getSessionDurationSeconds, clearSessionTracking } from '@/lib/activity-logger';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantSessionConfig } from '@/hooks/use-tenant-session-config';

interface SessionTimeoutContextType {
  isWarning: boolean;
  remainingTime: number;
  resetTimer: () => void;
  sessionTimeoutMinutes: number;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { config } = useTenantSessionConfig();

  // Memoize timeout values to prevent unnecessary re-renders
  const timeoutConfig = useMemo(() => ({
    idleTimeout: config.sessionTimeoutMinutes * 60 * 1000,
    warningThreshold: config.warningThresholdMinutes * 60 * 1000,
  }), [config.sessionTimeoutMinutes, config.warningThresholdMinutes]);

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
    idleTimeout: timeoutConfig.idleTimeout,
    warningThreshold: timeoutConfig.warningThreshold,
    onTimeout: handleTimeout,
    enabled: isAuthenticated,
  });

  return (
    <SessionTimeoutContext.Provider value={{ 
      isWarning, 
      remainingTime, 
      resetTimer, 
      sessionTimeoutMinutes: config.sessionTimeoutMinutes 
    }}>
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
