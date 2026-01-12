import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { logger } from '@/lib/logger';

// Configuration constants
const TOKEN_REFRESH_THRESHOLD_PERCENT = 0.8; // Refresh at 80% of token lifetime
const TOKEN_REFRESH_MARGIN_MS = 60 * 1000; // Minimum 60 seconds before expiry
const MAX_REFRESH_RETRIES = 3;
const REFRESH_RETRY_DELAY_MS = 2000; // 2 seconds base delay

// Public routes where token refresh should be skipped
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/auth/callback',
  '/forgot-password',
  '/reset-password',
  '/invite',
  '/register',
  '/install',
  '/terms',
  '/privacy',
  '/cookies',
  '/acceptable-use',
  '/refund-policy',
  '/dpa',
  '/sla',
];

/**
 * Extract expiration timestamp from JWT access token
 */
function getTokenExpirationTime(accessToken: string): number | null {
  try {
    // JWT structure: header.payload.signature
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (base64url)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded);
    
    // exp is in seconds, convert to milliseconds
    return parsed.exp ? parsed.exp * 1000 : null;
  } catch {
    logger.warn('Failed to parse token expiration');
    return null;
  }
}

/**
 * Calculate when to refresh the token based on its expiration
 */
function calculateRefreshTime(expiresAt: number, issuedAt?: number): number {
  const now = Date.now();
  const lifetime = issuedAt ? expiresAt - issuedAt : expiresAt - now;
  
  // Calculate the threshold time (80% of lifetime)
  const thresholdTime = expiresAt - (lifetime * (1 - TOKEN_REFRESH_THRESHOLD_PERCENT));
  
  // Ensure we refresh at least TOKEN_REFRESH_MARGIN_MS before expiry
  const marginTime = expiresAt - TOKEN_REFRESH_MARGIN_MS;
  
  // Use the earlier of the two times
  return Math.min(thresholdTime, marginTime);
}

interface TokenRefreshState {
  isRefreshing: boolean;
  retryCount: number;
  lastRefreshAt: number | null;
  lastError: string | null;
}

/**
 * Hook that proactively refreshes access tokens before expiration.
 * Only attempts refresh when a valid session with refresh token exists.
 */
export function useTokenRefresh() {
  const { session, isAuthenticated } = useAuth();
  const location = useLocation();
  
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<TokenRefreshState>({
    isRefreshing: false,
    retryCount: 0,
    lastRefreshAt: null,
    lastError: null,
  });
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  /**
   * Perform the token refresh with retry logic
   */
  const performRefresh = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent refresh attempts
    if (stateRef.current.isRefreshing) {
      logger.debug('Token refresh already in progress, skipping');
      return false;
    }
    
    stateRef.current.isRefreshing = true;
    
    try {
      // Double-check we still have a valid session before refreshing
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.refresh_token) {
        logger.debug('No refresh token available, skipping refresh');
        stateRef.current.isRefreshing = false;
        return false;
      }
      
      logger.debug('Attempting proactive token refresh');
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        const errorMsg = error.message.toLowerCase();
        
        // Check for permanent failures that shouldn't be retried
        const isPermanentFailure = 
          errorMsg.includes('refresh_token_not_found') ||
          errorMsg.includes('invalid_grant') ||
          errorMsg.includes('session_not_found') ||
          errorMsg.includes('invalid refresh token');
        
        if (isPermanentFailure) {
          logger.warn('Refresh token is invalid or expired, user needs to re-authenticate');
          stateRef.current.lastError = 'refresh_token_invalid';
          stateRef.current.isRefreshing = false;
          
          // Clear local state and sign out
          await supabase.auth.signOut({ scope: 'local' });
          return false;
        }
        
        // Retry transient errors
        if (stateRef.current.retryCount < MAX_REFRESH_RETRIES) {
          stateRef.current.retryCount++;
          const delay = REFRESH_RETRY_DELAY_MS * Math.pow(2, stateRef.current.retryCount - 1);
          
          logger.debug(`Token refresh failed, retrying in ${delay}ms (attempt ${stateRef.current.retryCount}/${MAX_REFRESH_RETRIES})`);
          
          stateRef.current.isRefreshing = false;
          
          // Schedule retry
          setTimeout(() => {
            if (isMountedRef.current) {
              performRefresh();
            }
          }, delay);
          
          return false;
        }
        
        logger.error('Token refresh failed after max retries:', error);
        stateRef.current.lastError = error.message;
        stateRef.current.isRefreshing = false;
        return false;
      }
      
      if (data.session) {
        logger.debug('Token refreshed successfully');
        stateRef.current.retryCount = 0;
        stateRef.current.lastRefreshAt = Date.now();
        stateRef.current.lastError = null;
        stateRef.current.isRefreshing = false;
        return true;
      }
      
      stateRef.current.isRefreshing = false;
      return false;
    } catch (err) {
      logger.error('Unexpected error during token refresh:', err);
      stateRef.current.lastError = err instanceof Error ? err.message : 'unknown_error';
      stateRef.current.isRefreshing = false;
      return false;
    }
  }, []);

  /**
   * Schedule the next token refresh based on current session
   */
  const scheduleRefresh = useCallback((accessToken: string) => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    const expiresAt = getTokenExpirationTime(accessToken);
    if (!expiresAt) {
      logger.warn('Could not determine token expiration, skipping refresh scheduling');
      return;
    }
    
    const now = Date.now();
    const refreshAt = calculateRefreshTime(expiresAt);
    const delayMs = Math.max(0, refreshAt - now);
    
    // Don't schedule if token is already expired or expires very soon
    if (delayMs === 0 && expiresAt <= now) {
      logger.debug('Token already expired, triggering immediate refresh');
      performRefresh();
      return;
    }
    
    const expiresInMinutes = Math.round((expiresAt - now) / 60000);
    const refreshInMinutes = Math.round(delayMs / 60000);
    
    logger.debug(`Token expires in ${expiresInMinutes}min, scheduling refresh in ${refreshInMinutes}min`);
    
    refreshTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        performRefresh().then(success => {
          // If refresh succeeded, schedule the next one
          if (success && isMountedRef.current) {
            supabase.auth.getSession().then(({ data: { session: newSession } }) => {
              if (newSession?.access_token) {
                scheduleRefresh(newSession.access_token);
              }
            });
          }
        });
      }
    }, delayMs);
  }, [performRefresh]);

  /**
   * Clear all timers
   */
  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    stateRef.current = {
      isRefreshing: false,
      retryCount: 0,
      lastRefreshAt: null,
      lastError: null,
    };
  }, []);

  // Main effect: Set up refresh scheduling based on session state
  useEffect(() => {
    isMountedRef.current = true;
    
    // Skip on public routes
    if (isPublicRoute) {
      clearRefreshTimer();
      return;
    }
    
    // Only schedule refresh for authenticated users with valid sessions
    if (isAuthenticated && session?.access_token) {
      scheduleRefresh(session.access_token);
    } else {
      clearRefreshTimer();
    }
    
    return () => {
      isMountedRef.current = false;
      clearRefreshTimer();
    };
  }, [isAuthenticated, session?.access_token, isPublicRoute, scheduleRefresh, clearRefreshTimer]);

  // Listen for auth state changes to reschedule refresh
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (isPublicRoute) return;
      
      if (event === 'TOKEN_REFRESHED' && newSession?.access_token) {
        logger.debug('Auth event: TOKEN_REFRESHED - rescheduling proactive refresh');
        stateRef.current.lastRefreshAt = Date.now();
        stateRef.current.retryCount = 0;
        scheduleRefresh(newSession.access_token);
      } else if (event === 'SIGNED_OUT') {
        logger.debug('Auth event: SIGNED_OUT - clearing refresh timer');
        clearRefreshTimer();
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [isPublicRoute, scheduleRefresh, clearRefreshTimer]);

  return {
    /** Manually trigger a token refresh */
    refreshNow: performRefresh,
    /** Get current refresh state */
    getState: () => ({ ...stateRef.current }),
    /** Clear scheduled refresh */
    clearRefresh: clearRefreshTimer,
  };
}
