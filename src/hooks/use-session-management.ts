import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const SESSION_TOKEN_KEY = 'app_session_token';
const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface SessionValidationResult {
  valid: boolean;
  reason?: string;
  originalCountry?: string;
  currentCountry?: string;
}

/**
 * Hook to manage user sessions with concurrent session limits and IP validation.
 * Registers sessions on login, validates periodically, and handles forced logouts.
 */
export function useSessionManagement() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRegistering = useRef(false);

  // Get device info for session tracking
  const getDeviceInfo = useCallback(() => {
    return {
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      touchSupport: 'ontouchstart' in window,
    };
  }, []);

  // Register a new session on login
  const registerSession = useCallback(async () => {
    if (isRegistering.current) return;
    isRegistering.current = true;

    try {
      const { data, error } = await supabase.functions.invoke('manage-session', {
        body: {
          action: 'register',
          deviceInfo: getDeviceInfo(),
          userAgent: navigator.userAgent,
        },
      });

      if (error) {
        console.error('Session registration failed:', error);
        return;
      }

      if (data?.success && data?.sessionToken) {
        localStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
        console.log('Session registered successfully');

        // Notify if other sessions were invalidated
        if (data.invalidatedSessions > 0) {
          toast({
            title: 'Session Started',
            description: `You've been logged out from ${data.invalidatedSessions} other device(s).`,
          });
        }
      }
    } catch (err) {
      console.error('Session registration error:', err);
    } finally {
      isRegistering.current = false;
    }
  }, [getDeviceInfo]);

  // Validate the current session
  const validateSession = useCallback(async (): Promise<SessionValidationResult> => {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      return { valid: false, reason: 'no_token' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-session', {
        body: {
          action: 'validate',
          sessionToken,
        },
      });

      if (error) {
        console.error('Session validation failed:', error);
        return { valid: false, reason: 'validation_error' };
      }

      return data as SessionValidationResult;
    } catch (err) {
      console.error('Session validation error:', err);
      return { valid: false, reason: 'network_error' };
    }
  }, []);

  // Handle session invalidation (forced logout)
  const handleSessionInvalid = useCallback(async (reason: string, details?: Record<string, string>) => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    
    // Sign out from Supabase
    await supabase.auth.signOut();

    let message = 'Your session has ended.';
    
    switch (reason) {
      case 'session_not_found':
        message = 'Your session was terminated. Please log in again.';
        break;
      case 'session_expired':
        message = 'Your session has expired due to inactivity.';
        break;
      case 'ip_country_changed':
        message = `Security alert: Your location changed from ${details?.originalCountry} to ${details?.currentCountry}. Please log in again.`;
        break;
      case 'new_login':
        message = 'You have been logged out because you logged in from another device.';
        break;
    }

    toast({
      title: 'Session Ended',
      description: message,
      variant: 'destructive',
    });

    navigate('/login');
  }, [navigate]);

  // Send heartbeat to keep session alive
  const sendHeartbeat = useCallback(async () => {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) return;

    try {
      const { data } = await supabase.functions.invoke('manage-session', {
        body: {
          action: 'heartbeat',
          sessionToken,
        },
      });

      if (data && !data.success && !data.valid) {
        // Session is invalid, force logout
        handleSessionInvalid(data.reason || 'session_invalid');
      }
    } catch (err) {
      console.error('Session heartbeat error:', err);
    }
  }, [handleSessionInvalid]);

  // Invalidate session on logout
  const invalidateSession = useCallback(async () => {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) return;

    try {
      await supabase.functions.invoke('manage-session', {
        body: {
          action: 'invalidate',
          sessionToken,
        },
      });
    } catch (err) {
      console.error('Session invalidation error:', err);
    } finally {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  }, []);

  // Effect: Register session on login, start heartbeat
  useEffect(() => {
    if (isAuthenticated && user) {
      // Register new session
      registerSession();

      // Start heartbeat interval
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

      // Validate session periodically (every heartbeat)
      const validateInterval = setInterval(async () => {
        const result = await validateSession();
        if (!result.valid && result.reason !== 'no_token') {
          handleSessionInvalid(result.reason || 'unknown', {
            originalCountry: result.originalCountry || '',
            currentCountry: result.currentCountry || '',
          });
        }
      }, HEARTBEAT_INTERVAL);

      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        clearInterval(validateInterval);
      };
    } else {
      // User logged out, clear interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }
  }, [isAuthenticated, user, registerSession, sendHeartbeat, validateSession, handleSessionInvalid]);

  return {
    validateSession,
    invalidateSession,
    registerSession,
  };
}
