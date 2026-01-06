import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const VERIFIED_DEVICE_STORAGE_KEY = 'invitation_verified_device_token';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, mfaEnabled, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Check if device was previously verified through invitation process
    const hasVerifiedToken = localStorage.getItem(VERIFIED_DEVICE_STORAGE_KEY);
    
    if (hasVerifiedToken) {
      // Device was previously verified, go directly to login
      return <Navigate to="/login" replace />;
    }
    
    // No verified token, require invitation code
    return <Navigate to="/invite" replace />;
  }

  // If authenticated but MFA not enabled, redirect to MFA setup
  // (unless already on the MFA setup page)
  if (!mfaEnabled && location.pathname !== '/mfa-setup') {
    return <Navigate to="/mfa-setup" replace />;
  }

  return <>{children}</>;
}
