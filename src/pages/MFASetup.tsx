// MFA Setup Page - Two-Factor Authentication enrollment
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { useMFA } from '@/hooks/useMFA';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, Smartphone, Copy, Check, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logUserActivity } from '@/lib/activity-logger';
import { AuthHeroImage } from '@/components/ui/optimized-image';

type Step = 'intro' | 'qrcode' | 'verify' | 'success';

interface EnrollData {
  id: string;
  qrCode: string;
  secret: string;
}

export default function MFASetup() {
  const { t } = useTranslation();
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
    const result = await enroll(tenantName || 'DHUUD');
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
        title: t('mfaSetup.twoFactorEnabled'),
        description: t('mfaSetup.twoFactorEnabledMessage'),
      });
    }
  };

  const copySecret = async () => {
    if (enrollData?.secret) {
      await navigator.clipboard.writeText(enrollData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: t('mfaSetup.secretCopied'),
        description: t('mfaSetup.secretCopiedMessage'),
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
    <div className="flex min-h-screen">
      {/* Left Side - Industrial Image */}
      <AuthHeroImage 
        title={t('mfaSetup.secureYourAccount')} 
        subtitle={t('mfaSetup.twoFactorRequired')} 
      />

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
            <p className="mt-2 text-muted-foreground">{t('mfaSetup.setupDescription')}</p>
          </div>

          {/* Step Content */}
          <Card>
            {step === 'intro' && (
              <>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    {t('mfaSetup.twoFactorRequiredTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('mfaSetup.twoFactorRequiredDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted p-4 text-sm">
                    <p className="font-medium mb-2">{t('mfaSetup.youWillNeed')}</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>{t('mfaSetup.smartphone')}</li>
                      <li>{t('mfaSetup.authenticatorApps')}</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={handleStartEnrollment} 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin me-2" />
                    ) : (
                      <Smartphone className="h-4 w-4 me-2" />
                    )}
                    {t('mfaSetup.beginSetup')}
                    <ChevronRight className="h-4 w-4 ms-2" />
                  </Button>
                </CardContent>
              </>
            )}

            {step === 'qrcode' && enrollData && (
              <>
                <CardHeader>
                  <CardTitle>{t('mfaSetup.scanQrCode')}</CardTitle>
                  <CardDescription>
                    {t('mfaSetup.scanQrDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative p-4 bg-white rounded-lg">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1.5 shadow-sm z-10">
                        <img
                          src="/lovable-uploads/dhuud-logo.png"
                          alt="DHUUD"
                          className="h-10 w-10 object-contain"
                        />
                      </div>
                      <img
                        src={enrollData.qrCode}
                        alt="QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      DHUUD HSSE Platform
                    </p>
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    <p className="mb-2">{t('mfaSetup.cantScan')}</p>
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
                      <ChevronLeft className="h-4 w-4 me-2" />
                      {t('common.back')}
                    </Button>
                    <Button
                      onClick={() => setStep('verify')}
                      className="flex-1"
                    >
                      {t('common.continue')}
                      <ChevronRight className="h-4 w-4 ms-2" />
                    </Button>
                  </div>
                </CardContent>
              </>
            )}

            {step === 'verify' && (
              <>
                <CardHeader>
                  <CardTitle>{t('mfaSetup.verifySetup')}</CardTitle>
                  <CardDescription>
                    {t('mfaSetup.verifyDescription')}
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
                      <ChevronLeft className="h-4 w-4 me-2" />
                      {t('common.back')}
                    </Button>
                    <Button
                      onClick={handleVerify}
                      disabled={code.length !== 6 || loading}
                      className="flex-1"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                      ) : null}
                      {t('common.verify')}
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
                    {t('mfaSetup.setupComplete')}
                  </CardTitle>
                  <CardDescription>
                    {t('mfaSetup.setupCompleteMessage')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleComplete} className="w-full">
                    {t('mfaSetup.continueToDashboard')}
                    <ChevronRight className="h-4 w-4 ms-2" />
                  </Button>
                </CardContent>
              </>
            )}
          </Card>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>{t('security.protectedByZeroTrust')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}