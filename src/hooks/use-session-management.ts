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
  const validateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRegistering = useRef(false);
  
  // Track if we've already registered a session for the current user
  const hasRegisteredSession = useRef(false);
  const lastUserId = useRef<string | null>(null);
  
  // CRITICAL: Track logout state to prevent race conditions with pending operations
  const isLoggingOut = useRef(false);

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

  // Helper to check if we have a valid auth session before making edge function calls
  const hasValidAuthSession = useCallback(async (): Promise<boolean> => {
    // CRITICAL: Check logout flag first to prevent race conditions
    if (isLoggingOut.current) {
      console.log('Logout in progress, skipping auth check');
      return false;
    }
    
    try {
      // First check local session state (fast, no network)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return false;
      }
      
      // Then validate the token is actually valid server-side
      const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !validatedUser) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }, []);

  // Register a new session on login
  const registerSession = useCallback(async () => {
    if (isRegistering.current) return;
    
    // Don't try to register if not authenticated
    if (!isAuthenticated || !user?.id) {
      console.log('User not authenticated, skipping session registration');
      return;
    }
    
    isRegistering.current = true;

    try {
      // Validate we have a valid auth session before calling edge function
      const isValid = await hasValidAuthSession();
      if (!isValid) {
        console.log('No valid auth session, skipping session registration');
        return;
      }

      const { data, error } = await supabase.functions.invoke('manage-session', {
        body: {
          action: 'register',
          deviceInfo: getDeviceInfo(),
          userAgent: navigator.userAgent,
        },
      });

      if (error) {
        // Handle 401 errors gracefully - session may have expired during the call
        const errorMsg = error.message || '';
        const isAuthExpired = errorMsg.includes('401') || 
                              errorMsg.includes('Invalid token') ||
                              errorMsg.includes('auth_session_expired') ||
                              errorMsg.includes('AUTH_SESSION_EXPIRED');
        if (isAuthExpired) {
          console.log('Auth session expired during registration, clearing local state');
          localStorage.removeItem(SESSION_TOKEN_KEY);
          // Force clear the stale session from Supabase client
          await supabase.auth.signOut({ scope: 'local' });
          return;
        }
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
  }, [getDeviceInfo, isAuthenticated, user?.id]);

  // Validate the current session
  const validateSession = useCallback(async (): Promise<SessionValidationResult> => {
    // CRITICAL: Check logout flag first to prevent race conditions
    if (isLoggingOut.current) {
      console.log('Logout in progress, skipping validation');
      return { valid: false, reason: 'logout_in_progress' };
    }
    
    // Don't validate if not authenticated
    if (!isAuthenticated || !user?.id) {
      return { valid: false, reason: 'not_authenticated' };
    }
    
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      return { valid: false, reason: 'no_token' };
    }

    try {
      // Validate we have a valid auth session before calling edge function
      const isValid = await hasValidAuthSession();
      if (!isValid) {
        localStorage.removeItem(SESSION_TOKEN_KEY);
        return { valid: false, reason: 'auth_session_expired' };
      }

      const { data, error } = await supabase.functions.invoke('manage-session', {
        body: {
          action: 'validate',
          sessionToken,
        },
      });

      if (error) {
        // Handle 401 gracefully - auth session expired
        const isAuthExpired = error.message?.includes('401') || 
                              error.message?.includes('Invalid token') ||
                              error.message?.includes('auth_session_expired') ||
                              error.message?.includes('AUTH_SESSION_EXPIRED');
        if (isAuthExpired) {
          localStorage.removeItem(SESSION_TOKEN_KEY);
          // Force clear the stale session from Supabase client
          await supabase.auth.signOut({ scope: 'local' });
          return { valid: false, reason: 'auth_session_expired' };
        }
        console.error('Session validation failed:', error);
        return { valid: false, reason: 'validation_error' };
      }

      return data as SessionValidationResult;
    } catch (err) {
      console.error('Session validation error:', err);
      return { valid: false, reason: 'network_error' };
    }
  }, [hasValidAuthSession, isAuthenticated, user?.id]);

  // Handle session invalidation (forced logout)
  const handleSessionInvalid = useCallback(async (reason: string, details?: Record<string, string>) => {
    // CRITICAL: Set logout flag FIRST to prevent any further edge function calls
    isLoggingOut.current = true;
    
    // Clear intervals immediately to prevent race conditions
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (validateIntervalRef.current) {
      clearInterval(validateIntervalRef.current);
      validateIntervalRef.current = null;
    }
    
    localStorage.removeItem(SESSION_TOKEN_KEY);
    
    // Reset registration tracking
    hasRegisteredSession.current = false;
    lastUserId.current = null;
    
    // Sign out from Supabase - use local scope to avoid errors when session is already gone
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      // Ignore errors - session may already be gone
      console.log('SignOut during handleSessionInvalid failed (likely already signed out):', err);
    }

    // Only show toast for non-auth-expired reasons (auth-expired is handled silently)
    if (reason !== 'auth_session_expired') {
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
    }

    navigate('/login');
    
    // Reset logout flag after navigation (for potential re-login)
    // Use setTimeout to ensure navigation completes first
    setTimeout(() => {
      isLoggingOut.current = false;
    }, 100);
  }, [navigate]);

  // Send heartbeat to keep session alive
  const sendHeartbeat = useCallback(async () => {
    // CRITICAL: Check logout flag first to prevent race conditions
    if (isLoggingOut.current) {
      console.log('Logout in progress, skipping heartbeat');
      return;
    }
    
    // Don't send heartbeat if not authenticated
    if (!isAuthenticated || !user?.id) {
      return;
    }
    
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) return;

    try {
      // Validate we have a valid auth session before calling edge function
      const isValid = await hasValidAuthSession();
      if (!isValid) {
        console.log('No valid auth session, skipping heartbeat');
        return;
      }

      const { data, error } = await supabase.functions.invoke('manage-session', {
        body: {
          action: 'heartbeat',
          sessionToken,
        },
      });

      // Handle 401 gracefully - don't force logout on network errors
      if (error) {
        const isAuthExpired = error.message?.includes('401') || 
                              error.message?.includes('Invalid token') ||
                              error.message?.includes('auth_session_expired') ||
                              error.message?.includes('AUTH_SESSION_EXPIRED');
        if (isAuthExpired) {
          console.log('Auth session expired during heartbeat, clearing local state');
          localStorage.removeItem(SESSION_TOKEN_KEY);
          // Force clear the stale session from Supabase client
          await supabase.auth.signOut({ scope: 'local' });
          return;
        }
        console.error('Session heartbeat error:', error);
        return;
      }

      if (data && !data.success && !data.valid) {
        // Session is invalid, force logout
        handleSessionInvalid(data.reason || 'session_invalid');
      }
    } catch (err) {
      console.error('Session heartbeat error:', err);
    }
  }, [handleSessionInvalid, hasValidAuthSession, isAuthenticated, user?.id]);

  // Invalidate session on logout
  const invalidateSession = useCallback(async () => {
    // CRITICAL: Check logout flag first to prevent race conditions
    if (isLoggingOut.current) {
      console.log('Logout in progress, skipping invalidation call');
      localStorage.removeItem(SESSION_TOKEN_KEY);
      hasRegisteredSession.current = false;
      lastUserId.current = null;
      return;
    }

    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) return;

    try {
      // Validate we have a valid auth session before calling edge function
      const isValid = await hasValidAuthSession();
      if (!isValid) {
        console.log('No valid auth session, skipping session invalidation call');
        localStorage.removeItem(SESSION_TOKEN_KEY);
        hasRegisteredSession.current = false;
        lastUserId.current = null;
        return;
      }

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
      // Reset registration tracking on logout
      hasRegisteredSession.current = false;
      lastUserId.current = null;
    }
  }, [hasValidAuthSession]);

  // Store handlers in refs to avoid effect re-runs from callback recreation
  // Update synchronously during render (safe for refs, avoids useEffect ordering issues)
  const handlersRef = useRef({ sendHeartbeat, validateSession, handleSessionInvalid, registerSession });
  handlersRef.current = { sendHeartbeat, validateSession, handleSessionInvalid, registerSession };

  // Effect: Register session on login, start heartbeat
  // Only depends on isAuthenticated and user?.id to prevent unnecessary re-runs
  useEffect(() => {
    const userId = user?.id;
    
    if (isAuthenticated && userId) {
      // Check if this is a new user (new login)
      if (userId !== lastUserId.current) {
        // New user login - reset registration tracking
        hasRegisteredSession.current = false;
        lastUserId.current = userId;
      }

      // Only register if we haven't already registered for this session
      if (!hasRegisteredSession.current) {
        hasRegisteredSession.current = true;
        handlersRef.current.registerSession();
      }

      // Start heartbeat interval (only if not already running)
      if (!heartbeatIntervalRef.current) {
        heartbeatIntervalRef.current = setInterval(() => {
          handlersRef.current.sendHeartbeat();
        }, HEARTBEAT_INTERVAL);
      }

      // Start validation interval (only if not already running)
      if (!validateIntervalRef.current) {
        validateIntervalRef.current = setInterval(async () => {
          const result = await handlersRef.current.validateSession();
          // Only handle invalid sessions that aren't auth-related
          if (!result.valid && result.reason !== 'no_token' && result.reason !== 'auth_session_expired') {
            handlersRef.current.handleSessionInvalid(result.reason || 'unknown', {
              originalCountry: result.originalCountry || '',
              currentCountry: result.currentCountry || '',
            });
          }
        }, HEARTBEAT_INTERVAL);
      }

      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        if (validateIntervalRef.current) {
          clearInterval(validateIntervalRef.current);
          validateIntervalRef.current = null;
        }
      };
    } else {
      // User logged out, clear intervals and reset tracking
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (validateIntervalRef.current) {
        clearInterval(validateIntervalRef.current);
        validateIntervalRef.current = null;
      }
      hasRegisteredSession.current = false;
      lastUserId.current = null;
    }
  }, [isAuthenticated, user?.id]);

  return {
    validateSession,
    invalidateSession,
    registerSession,
  };
}
