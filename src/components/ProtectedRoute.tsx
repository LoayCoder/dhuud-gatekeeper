import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuthAndMFA = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      setAuthenticated(true);

      // Check if MFA is enabled (has verified TOTP factors)
      const { data: mfaData } = await supabase.auth.mfa.listFactors();
      const hasVerifiedMFA = (mfaData?.totp || []).some(f => f.status === 'verified');
      setMfaEnabled(hasVerifiedMFA);
      setLoading(false);
    };

    checkAuthAndMFA();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setAuthenticated(false);
        setMfaEnabled(false);
        setLoading(false);
        return;
      }

      setAuthenticated(true);
      
      // Re-check MFA status on auth change
      const { data: mfaData } = await supabase.auth.mfa.listFactors();
      const hasVerifiedMFA = (mfaData?.totp || []).some(f => f.status === 'verified');
      setMfaEnabled(hasVerifiedMFA);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/invite" replace />;
  }

  // If authenticated but MFA not enabled, redirect to MFA setup
  // (unless already on the MFA setup page)
  if (!mfaEnabled && location.pathname !== '/mfa-setup') {
    return <Navigate to="/mfa-setup" replace />;
  }

  return <>{children}</>;
}
