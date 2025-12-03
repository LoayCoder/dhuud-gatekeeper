import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Loader2, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logUserActivity } from "@/lib/activity-logger";
import { useTrustedDevice } from "@/hooks/use-trusted-device";
import { useMFABackupCodes } from "@/hooks/use-mfa-backup-codes";

interface MFAVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
  userId?: string;
}

export function MFAVerificationDialog({
  open,
  onOpenChange,
  factorId,
  onSuccess,
  onCancel,
  userId,
}: MFAVerificationDialogProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const { trustDevice: saveTrustedDevice } = useTrustedDevice();
  const { verifyCode: verifyBackupCode } = useMFABackupCodes();

  const handleVerify = async () => {
    if (useBackup) {
      await handleBackupCodeVerify();
    } else {
      await handleTOTPVerify();
    }
  };

  const handleBackupCodeVerify = async () => {
    if (!backupCode.trim()) return;

    setLoading(true);

    try {
      const isValid = await verifyBackupCode(backupCode.trim());

      if (!isValid) {
        await logUserActivity({ 
          eventType: 'mfa_verification_failed',
          metadata: { reason: 'invalid_backup_code' }
        });
        
        toast({
          title: t('backupCodes.invalidCode'),
          description: t('mfaVerification.invalidCodeMessage'),
          variant: "destructive",
        });
        setBackupCode("");
        setLoading(false);
        return;
      }

      // Trust device if checkbox was checked
      if (trustDevice && userId) {
        await saveTrustedDevice(userId);
      }

      toast({
        title: t('common.success'),
        description: t('backupCodes.codeUsedSuccess'),
      });

      // Success!
      onSuccess();
    } catch (err) {
      toast({
        title: t('mfaVerification.verificationFailed'),
        description: t('mfaVerification.unexpectedError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTOTPVerify = async () => {
    if (code.length !== 6) return;

    setLoading(true);

    try {
      // Create challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        toast({
          title: t('mfaVerification.verificationFailed'),
          description: challengeError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        // Log failed verification attempt
        await logUserActivity({ 
          eventType: 'mfa_verification_failed',
          metadata: { reason: verifyError.message }
        });
        
        toast({
          title: t('mfaVerification.invalidCode'),
          description: t('mfaVerification.invalidCodeMessage'),
          variant: "destructive",
        });
        setCode("");
        setLoading(false);
        return;
      }

      // Trust device if checkbox was checked
      if (trustDevice && userId) {
        await saveTrustedDevice(userId);
      }

      // Success!
      onSuccess();
    } catch (err) {
      toast({
        title: t('mfaVerification.verificationFailed'),
        description: t('mfaVerification.unexpectedError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    // Sign out since we can't complete the login
    await supabase.auth.signOut();
    onCancel();
    onOpenChange(false);
  };

  const toggleMode = () => {
    setUseBackup(!useBackup);
    setCode("");
    setBackupCode("");
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('mfaVerification.title')}</DialogTitle>
          <DialogDescription>
            {useBackup 
              ? t('backupCodes.description')
              : t('mfaVerification.description')
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              {useBackup ? (
                <Key className="h-10 w-10 text-primary" />
              ) : (
                <ShieldCheck className="h-10 w-10 text-primary" />
              )}
            </div>
          </div>

          {/* Input */}
          {useBackup ? (
            <div className="flex justify-center">
              <Input
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                placeholder={t('backupCodes.enterCode')}
                className="max-w-[200px] text-center font-mono"
                disabled={loading}
                autoFocus
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={loading}
                autoFocus
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
          )}

          <p className="text-sm text-muted-foreground text-center">
            {useBackup 
              ? t('backupCodes.eachCodeOnce')
              : t('mfaVerification.openAuthenticator')
            }
          </p>

          {/* Toggle backup code mode */}
          <div className="text-center">
            <Button variant="link" size="sm" onClick={toggleMode} disabled={loading}>
              {useBackup ? t('backupCodes.useAuthenticator') : t('backupCodes.useBackupCode')}
            </Button>
          </div>

          {/* Trust device checkbox */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse justify-center pt-2">
            <Checkbox
              id="trustDevice"
              checked={trustDevice}
              onCheckedChange={(checked) => setTrustDevice(checked === true)}
              disabled={loading}
            />
            <label
              htmlFor="trustDevice"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              {t('trustedDevices.trustFor15Days')}
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            {t('mfaVerification.cancel')}
          </Button>
          <Button
            onClick={handleVerify}
            disabled={loading || (useBackup ? !backupCode.trim() : code.length !== 6)}
          >
            {loading ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : null}
            {t('mfaVerification.verify')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}