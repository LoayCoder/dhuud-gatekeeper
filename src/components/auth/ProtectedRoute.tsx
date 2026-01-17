import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { OfflineAccessNotice } from '@/components/offline/OfflineAccessNotice';
import { sessionCache } from '@/hooks/use-cached-session';

const VERIFIED_DEVICE_STORAGE_KEY = 'invitation_verified_device_token';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { isAuthenticated, mfaEnabled, tenantMfaVerified, isLoading, profile, user, validateTenantAccess, isUsingCachedSession } = useAuth();
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const [accessValidated, setAccessValidated] = useState<boolean | null>(null);
  const [validating, setValidating] = useState(false);
  
  // Offline MFA check state - check cached session directly to avoid race conditions
  const [offlineMfaChecked, setOfflineMfaChecked] = useState(false);
  const [offlineMfaValid, setOfflineMfaValid] = useState(false);

  // Check cached session for MFA status when offline
  useEffect(() => {
    const checkOfflineMfa = async () => {
      if (!isOnline && isAuthenticated && user) {
        try {
          const cached = await sessionCache.getCachedSession();
          if (cached && cached.userId === user.id) {
            // Check if MFA was verified in the cached session
            // FIX: Allow access if MFA is NOT enabled globally, OR if it is enabled and verified
            const mfaValid = !cached.mfaEnabled || (cached.mfaEnabled === true && cached.tenantMfaVerified === true);
            setOfflineMfaValid(mfaValid);
          } else {
            // No matching cache - MFA status unknown, assume valid if session exists?
            // No, safer to assume invalid if we can't verify policy
            setOfflineMfaValid(false);
          }
        } catch (err) {
          console.error('Error checking offline MFA:', err);
          setOfflineMfaValid(false);
        }
        setOfflineMfaChecked(true);
      } else if (isOnline) {
        // Reset when online - we'll use live state instead
        setOfflineMfaChecked(false);
        setOfflineMfaValid(false);
      }
    };
    checkOfflineMfa();
  }, [isOnline, isAuthenticated, user?.id]);

  // Validate tenant access on mount and when user/profile changes
  useEffect(() => {
    const validateAccess = async () => {
      if (!isAuthenticated || !user || isLoading) {
        setAccessValidated(null);
        return;
      }

      // OFFLINE MODE: Skip network validation if using cached session
      if (!isOnline) {
        // Check if we have a valid cached session for this user
        const cachedSession = await sessionCache.getCachedSession();
        if (cachedSession && cachedSession.userId === user.id) {
          // Trust cached session for offline access
          setAccessValidated(true);
          setValidating(false);
          return;
        }
        // No cache available offline - can't validate
        setAccessValidated(null);
        return;
      }

      setValidating(true);
      try {
        // Check if user is deleted or inactive
        if (profile?.is_deleted === true || profile?.is_active === false) {
          console.warn('Deleted/inactive user detected in ProtectedRoute');
          await supabase.auth.signOut();
          toast({
            title: t('auth.accountDeleted', 'Account Deactivated'),
            description: t('auth.accountDeletedDesc', 'Your account has been deactivated.'),
            variant: 'destructive',
          });
          setAccessValidated(false);
          return;
        }

        // Validate tenant access via edge function
        const isValid = await validateTenantAccess();
        setAccessValidated(isValid);
        
        if (!isValid) {
          toast({
            title: t('auth.sessionInvalidated', 'Session Ended'),
            description: t('auth.sessionInvalidatedDesc', 'Your session has been terminated. Please log in again.'),
            variant: 'destructive',
          });
        }
      } catch (err) {
        console.error('Error validating access:', err);
        setAccessValidated(true); // Fail open to avoid blocking users on network issues
      } finally {
        setValidating(false);
      }
    };

    validateAccess();
  }, [isAuthenticated, user?.id, profile?.is_deleted, profile?.is_active, isOnline]);

  // Show loading while:
  // 1. Auth is loading
  // 2. Validation is in progress  
  // 3. Offline and waiting for cache MFA check
  if (isLoading || validating || (!isOnline && isAuthenticated && !offlineMfaChecked)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || accessValidated === false) {
    // Check if device was previously verified through invitation process
    const hasVerifiedToken = localStorage.getItem(VERIFIED_DEVICE_STORAGE_KEY);
    
    if (hasVerifiedToken) {
      // Device was previously verified, go directly to login
      return <Navigate to="/login" replace />;
    }
    
    // No verified token, require invitation code
    return <Navigate to="/login" replace />;
  }

  // OFFLINE MODE: Check cached MFA status (not React state which may be stale)
  if (!isOnline) {
    if (!offlineMfaValid) {
      // Cached session doesn't have verified MFA - show offline notice
      return <OfflineAccessNotice reason="mfa_required" />;
    }
    // MFA was verified in cache - allow access, skip online-only MFA redirects
    return <>{children}</>;
  }

  // ONLINE MODE: Use live React state for MFA checks
  // If MFA not enabled globally, redirect to MFA setup
  if (!mfaEnabled && location.pathname !== '/mfa-setup') {
    return <Navigate to="/mfa-setup" replace />;
  }

  // If MFA is enabled globally but NOT verified for this tenant, redirect to MFA setup
  if (mfaEnabled && !tenantMfaVerified && location.pathname !== '/mfa-setup') {
    return <Navigate to="/mfa-setup" state={{ tenantVerification: true }} replace />;
  }

  return <>{children}</>;
}
