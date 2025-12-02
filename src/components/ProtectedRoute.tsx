import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

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
    return <Navigate to="/invite" replace />;
  }

  // If authenticated but MFA not enabled, redirect to MFA setup
  // (unless already on the MFA setup page)
  if (!mfaEnabled && location.pathname !== '/mfa-setup') {
    return <Navigate to="/mfa-setup" replace />;
  }

  return <>{children}</>;
}
