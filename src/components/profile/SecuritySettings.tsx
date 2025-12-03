import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { usePasswordBreachCheck } from "@/hooks/use-password-breach-check";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, CheckCircle2, XCircle, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { TwoFactorSetup } from "./TwoFactorSetup";
import { TrustedDevicesSection } from "./TrustedDevicesSection";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export function SecuritySettings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [breachWarning, setBreachWarning] = useState<string | null>(null);
  const { checkPassword, isChecking } = usePasswordBreachCheck();

  const passwordSchema = z.object({
    password: z
      .string()
      .min(8, t('securitySettings.atLeast8Chars'))
      .regex(/[A-Z]/, t('securitySettings.oneUppercase'))
      .regex(/[a-z]/, t('securitySettings.oneLowercase'))
      .regex(/[0-9]/, t('securitySettings.oneNumber')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('securitySettings.passwordsDoNotMatch'),
    path: ["confirmPassword"],
  });

  // Check requirements in real-time
  const requirements: PasswordRequirement[] = [
    { label: t('securitySettings.atLeast8Chars'), met: password.length >= 8 },
    { label: t('securitySettings.oneUppercase'), met: /[A-Z]/.test(password) },
    { label: t('securitySettings.oneLowercase'), met: /[a-z]/.test(password) },
    { label: t('securitySettings.oneNumber'), met: /[0-9]/.test(password) },
  ];

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const allRequirementsMet = requirements.every(r => r.met);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with Zod
    const validation = passwordSchema.safeParse({ password, confirmPassword });
    
    if (!validation.success) {
      toast({
        title: t('auth.validationError'),
        description: validation.error.errors[0]?.message || t('securitySettings.invalidPassword'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setBreachWarning(null);

    try {
      // Check for breached password
      const breachResult = await checkPassword(password);
      if (breachResult.isBreached) {
        const breachMessage = t('security.passwordBreached').replace('{{count}}', breachResult.count.toLocaleString());
        setBreachWarning(breachMessage);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;

      toast({
        title: t('securitySettings.passwordUpdated'),
        description: t('securitySettings.passwordUpdatedMessage'),
      });
      
      // Clear form after successful update
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: t('securitySettings.updateFailed'),
        description: error.message || t('securitySettings.updateFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">{t('securitySettings.twoFactorAuth')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('securitySettings.twoFactorDescription')}
          </p>
        </div>
        <TwoFactorSetup />
      </div>

      <Separator />

      {/* Trusted Devices Section */}
      <TrustedDevicesSection />

      <Separator />

      {/* Password Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">{t('securitySettings.changePassword')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('securitySettings.changePasswordDescription')}
          </p>
        </div>

        {/* Password Requirements */}
        <div className="rounded-lg border p-4 bg-muted/5">
          <h4 className="text-sm font-medium mb-3 ltr:text-left rtl:text-right">{t('securitySettings.passwordRequirements')}</h4>
          <ul className="flex flex-col space-y-2 rtl:items-end">
            {requirements.map((req, index) => (
              <li key={index} className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                {req.met ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className={req.met ? "text-green-600" : "text-muted-foreground"}>
                  {req.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="new-password">{t('securitySettings.newPassword')}</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute ltr:left-3 rtl:right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <Input 
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-9"
                placeholder={t('securitySettings.enterNewPassword')}
                autoComplete="new-password"
              />
              <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">{t('securitySettings.confirmNewPassword')}</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute ltr:left-3 rtl:right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <Input 
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="px-9"
                placeholder={t('securitySettings.confirmNewPasswordPlaceholder')}
                autoComplete="new-password"
              />
              <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
            {confirmPassword.length > 0 && (
              <div className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                {passwordsMatch ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-green-600">{t('securitySettings.passwordsMatch')}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <span className="text-destructive">{t('securitySettings.passwordsDoNotMatch')}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {breachWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{breachWarning}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end pt-2">
            <Button 
              type="submit" 
              disabled={loading || isChecking || !allRequirementsMet || !passwordsMatch}
            >
              {(loading || isChecking) && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('securitySettings.updatePassword')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
