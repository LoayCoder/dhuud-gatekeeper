import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

/**
 * Sub-hook providing auth validation and device info helpers
 * for session management operations.
 */
export function useSessionHelpers() {
    const { isAuthenticated, user } = useAuth();

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
            logger.debug('Logout in progress, skipping auth check');
            return false;
        }

        // OFFLINE CHECK: If offline, we can't validate against server
        if (!navigator.onLine) {
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

    return {
        isAuthenticated,
        user,
        isLoggingOut,
        getDeviceInfo,
        hasValidAuthSession,
    };
}
