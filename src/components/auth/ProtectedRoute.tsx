import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';

const VERIFIED_DEVICE_STORAGE_KEY = 'invitation_verified_device_token';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { isAuthenticated, mfaEnabled, tenantMfaVerified, isLoading, profile, user, validateTenantAccess } = useAuth();
  const location = useLocation();
  const [accessValidated, setAccessValidated] = useState<boolean | null>(null);
  const [validating, setValidating] = useState(false);

  // Validate tenant access on mount and when user/profile changes
  useEffect(() => {
    const validateAccess = async () => {
      if (!isAuthenticated || !user || isLoading) {
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
  }, [isAuthenticated, user?.id, profile?.is_deleted, profile?.is_active]);

  if (isLoading || validating) {
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
    return <Navigate to="/invite" replace />;
  }

  // If authenticated but MFA not enabled globally, redirect to MFA setup
  // (unless already on the MFA setup page)
  if (!mfaEnabled && location.pathname !== '/mfa-setup') {
    return <Navigate to="/mfa-setup" replace />;
  }

  // If MFA is enabled globally but NOT verified for this tenant, also redirect to MFA setup
  // This ensures per-tenant MFA verification
  if (mfaEnabled && !tenantMfaVerified && location.pathname !== '/mfa-setup') {
    return <Navigate to="/mfa-setup" state={{ tenantVerification: true }} replace />;
  }

  return <>{children}</>;
}
