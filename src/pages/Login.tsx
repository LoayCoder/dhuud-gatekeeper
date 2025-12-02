import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import industrialImage from '@/assets/industrial-safety.jpg';
import { z } from 'zod';
import { logUserActivity, startSessionTracking } from '@/lib/activity-logger';
import { MFAVerificationDialog } from '@/components/auth/MFAVerificationDialog';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { tenantName, activeLogoUrl, activePrimaryColor, isCodeValidated, invitationEmail, clearInvitationData, refreshTenantData } = useTheme();

  useEffect(() => {
    // Pre-fill email if coming from invitation
    if (invitationEmail) {
      setEmail(invitationEmail);
    }

    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check MFA status
        checkMFAAndNavigate();
      }
    });

    // Listen for auth changes - but don't auto-navigate if MFA is pending
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !showMFADialog) {
        checkMFAAndNavigate();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, invitationEmail, showMFADialog]);

  const checkMFAAndNavigate = async () => {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    
    if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
      // User needs to complete MFA
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find(f => f.status === 'verified');
      
      if (totpFactor) {
        setMfaFactorId(totpFactor.id);
        setShowMFADialog(true);
        return;
      }
    }
    
    // No MFA required or already at AAL2
    if (aal?.currentLevel === 'aal2' || aal?.nextLevel !== 'aal2') {
      navigate('/');
    }
  };

  const handleMFASuccess = async () => {
    setShowMFADialog(false);
    
    // Fetch tenant branding after successful MFA
    await refreshTenantData();

    // Start session tracking and log login event
    startSessionTracking();
    await logUserActivity({ eventType: 'login' });

    // Clear invitation data
    clearInvitationData();

    toast({
      title: 'Welcome Back',
      description: 'You have been logged in successfully.',
    });

    navigate('/');
  };

  const handleMFACancel = () => {
    setShowMFADialog(false);
    setMfaFactorId(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate input
      loginSchema.parse({ email, password });
      
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if MFA is required
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
        // User has 2FA enabled - show verification dialog
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.find(f => f.status === 'verified');
        
        if (totpFactor) {
          setMfaFactorId(totpFactor.id);
          setShowMFADialog(true);
          setLoading(false);
          return;
        }
      }

      // No MFA required - proceed with login
      await refreshTenantData();
      startSessionTracking();
      await logUserActivity({ eventType: 'login' });
      clearInvitationData();

      toast({
        title: 'Welcome Back',
        description: 'You have been logged in successfully.',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to log in',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen" dir="ltr">
      {/* Left Side - Industrial Image */}
      <div className="relative hidden w-1/2 lg:block">
        <img
          src={industrialImage}
          alt="Industrial Safety"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <h1 className="mb-2 text-4xl font-bold">Dhuud HSSE Platform</h1>
          <p className="text-lg text-white/90">
            Health, Safety, Security & Environment Management
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            {activeLogoUrl ? (
              <img src={activeLogoUrl} alt={tenantName} className="mx-auto mb-4 h-16 object-contain" />
            ) : (
              <div 
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: activePrimaryColor ? `hsl(${activePrimaryColor} / 0.1)` : 'hsl(var(--primary) / 0.1)' }}
              >
                <Shield 
                  className="h-8 w-8" 
                  style={{ color: activePrimaryColor ? `hsl(${activePrimaryColor})` : 'hsl(var(--primary))' }}
                />
              </div>
            )}
            <h2 className="text-3xl font-bold">{tenantName}</h2>
            <p className="mt-2 text-muted-foreground">Sign in to your account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12"
                />
              </div>
            </div>

            <Button type="submit" className="h-12 w-full text-lg" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/forgot-password')}
                className="text-sm"
              >
                Forgot password?
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/invite')}
                className="text-sm"
              >
                Back to invitation code
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Protected by Zero Trust Security</span>
          </div>
        </div>
      </div>

      {/* MFA Verification Dialog */}
      {mfaFactorId && (
        <MFAVerificationDialog
          open={showMFADialog}
          onOpenChange={setShowMFADialog}
          factorId={mfaFactorId}
          onSuccess={handleMFASuccess}
          onCancel={handleMFACancel}
        />
      )}
    </div>
  );
}
