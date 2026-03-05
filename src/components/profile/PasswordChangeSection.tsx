import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { usePasswordBreachCheck } from "@/hooks/use-password-breach-check";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, Lock, CheckCircle2, XCircle, Eye, EyeOff, AlertTriangle, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export function PasswordChangeSection() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [isOpen, setIsOpen] = useState(false);
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
  const metCount = requirements.filter(r => r.met).length;
  const strengthPercent = (metCount / requirements.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercent <= 25) return "bg-destructive";
    if (strengthPercent <= 50) return "bg-amber-500";
    if (strengthPercent <= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      
      // Clear form and collapse
      setPassword("");
      setConfirmPassword("");
      setIsOpen(false);
    } catch (error: unknown) {
      toast({
        title: t('securitySettings.updateFailed'),
        description: (error as Error).message || t('securitySettings.updateFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2" dir={direction}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between p-3 rounded-lg text-start transition-colors",
            "border bg-muted/30 hover:bg-muted/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-muted">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium text-sm">{t('securitySettings.changePassword')}</span>
              <span className="text-xs text-muted-foreground">
                {t('securitySettings.changePasswordDescription')}
              </span>
            </div>
          </div>
          <span className="text-xs text-primary hover:underline">
            {isOpen ? t('common.cancel') : t('common.change')}
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Compact Strength Meter */}
        {password.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t('securitySettings.passwordStrength')}</span>
              <span className={cn(
                "font-medium",
                strengthPercent === 100 ? "text-green-600" : "text-muted-foreground"
              )}>
                {metCount}/{requirements.length}
              </span>
            </div>
            <Progress value={strengthPercent} className={cn("h-1.5", getStrengthColor())} />
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="new-password" className="text-xs">{t('securitySettings.newPassword')}</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <Input 
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-9 h-9 text-sm"
                placeholder={t('securitySettings.enterNewPassword')}
                autoComplete="new-password"
              />
              <Lock className="absolute end-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Compact Requirements (shown only when typing) */}
          {password.length > 0 && !allRequirementsMet && (
            <div className="flex flex-wrap gap-2">
              {requirements.map((req, index) => (
                <span
                  key={index}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-colors",
                    req.met 
                      ? "bg-green-500/10 text-green-600" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {req.met ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {req.label}
                </span>
              ))}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="confirm-password" className="text-xs">{t('securitySettings.confirmNewPassword')}</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <Input 
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="px-9 h-9 text-sm"
                placeholder={t('securitySettings.confirmNewPasswordPlaceholder')}
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && (
                passwordsMatch ? (
                  <CheckCircle2 className="absolute end-3 top-2.5 h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="absolute end-3 top-2.5 h-4 w-4 text-destructive" />
                )
              )}
            </div>
          </div>

          {breachWarning && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs">{breachWarning}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            disabled={loading || isChecking || !allRequirementsMet || !passwordsMatch}
            size="sm"
            className="w-full"
          >
            {(loading || isChecking) && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
            {t('securitySettings.updatePassword')}
          </Button>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}
