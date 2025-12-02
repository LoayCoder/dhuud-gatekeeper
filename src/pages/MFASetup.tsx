import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { useMFA } from '@/hooks/useMFA';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, Smartphone, Copy, Check, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logUserActivity } from '@/lib/activity-logger';
import industrialImage from '@/assets/industrial-safety.jpg';

type Step = 'intro' | 'qrcode' | 'verify' | 'success';

interface EnrollData {
  id: string;
  qrCode: string;
  secret: string;
}

export default function MFASetup() {
  const [step, setStep] = useState<Step>('intro');
  const [loading, setLoading] = useState(false);
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const navigate = useNavigate();
  const { tenantName, logoUrl } = useTheme();
  const { enroll, challenge, verify, isEnabled, refreshFactors } = useMFA();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      // Check if MFA is already enabled
      await refreshFactors();
      setCheckingAuth(false);
    };

    checkAuth();
  }, [navigate, refreshFactors]);

  useEffect(() => {
    // If MFA is already enabled, redirect to home
    if (!checkingAuth && isEnabled) {
      navigate('/');
    }
  }, [isEnabled, checkingAuth, navigate]);

  const handleStartEnrollment = async () => {
    setLoading(true);
    const result = await enroll();
    setLoading(false);

    if (result) {
      setEnrollData({
        id: result.id,
        qrCode: result.totp.qr_code,
        secret: result.totp.secret,
      });
      setStep('qrcode');
    }
  };

  const handleVerify = async () => {
    if (!enrollData || code.length !== 6) return;

    setLoading(true);
    
    // Challenge the factor first
    const challengeId = await challenge(enrollData.id);
    
    if (!challengeId) {
      setLoading(false);
      return;
    }

    // Verify the code
    const success = await verify(enrollData.id, challengeId, code);
    setLoading(false);

    if (success) {
      setStep('success');
      await logUserActivity({ eventType: 'mfa_enabled' });
      toast({
        title: '2FA Enabled',
        description: 'Two-factor authentication has been enabled for your account.',
      });
    }
  };

  const copySecret = async () => {
    if (enrollData?.secret) {
      await navigator.clipboard.writeText(enrollData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Secret Copied',
        description: 'The setup key has been copied to your clipboard.',
      });
    }
  };

  const handleComplete = () => {
    navigate('/');
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <h1 className="mb-2 text-4xl font-bold">Secure Your Account</h1>
          <p className="text-lg text-white/90">
            Two-factor authentication is required for all users
          </p>
        </div>
      </div>

      {/* Right Side - MFA Setup */}
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            {logoUrl ? (
              <img src={logoUrl} alt={tenantName} className="mx-auto mb-4 h-16" />
            ) : (
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            )}
            <h2 className="text-3xl font-bold">{tenantName}</h2>
            <p className="mt-2 text-muted-foreground">Set up two-factor authentication</p>
          </div>

          {/* Step Content */}
          <Card>
            {step === 'intro' && (
              <>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Two-Factor Authentication Required
                  </CardTitle>
                  <CardDescription>
                    For security purposes, you must enable two-factor authentication to access your account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted p-4 text-sm">
                    <p className="font-medium mb-2">You will need:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>A smartphone with an authenticator app</li>
                      <li>Google Authenticator, Microsoft Authenticator, or Authy</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={handleStartEnrollment} 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Smartphone className="h-4 w-4 mr-2" />
                    )}
                    Begin Setup
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </>
            )}

            {step === 'qrcode' && enrollData && (
              <>
                <CardHeader>
                  <CardTitle>Scan QR Code</CardTitle>
                  <CardDescription>
                    Scan this QR code with your authenticator app
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img
                      src={enrollData.qrCode}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    <p className="mb-2">Can't scan? Enter this code manually:</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="bg-muted px-3 py-1 rounded text-xs font-mono">
                        {enrollData.secret}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copySecret}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setStep('intro')}
                      className="flex-1"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep('verify')}
                      className="flex-1"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </>
            )}

            {step === 'verify' && (
              <>
                <CardHeader>
                  <CardTitle>Verify Setup</CardTitle>
                  <CardDescription>
                    Enter the 6-digit code from your authenticator app
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={code}
                      onChange={setCode}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCode('');
                        setStep('qrcode');
                      }}
                      className="flex-1"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleVerify}
                      disabled={code.length !== 6 || loading}
                      className="flex-1"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Verify
                    </Button>
                  </div>
                </CardContent>
              </>
            )}

            {step === 'success' && (
              <>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Check className="h-5 w-5" />
                    Setup Complete!
                  </CardTitle>
                  <CardDescription>
                    Two-factor authentication is now enabled on your account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleComplete} className="w-full">
                    Continue to Dashboard
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </>
            )}
          </Card>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Protected by Zero Trust Security</span>
          </div>
        </div>
      </div>
    </div>
  );
}
