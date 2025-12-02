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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldOff, Loader2, AlertTriangle } from "lucide-react";
import { useMFA } from "@/hooks/useMFA";
import { toast } from "@/hooks/use-toast";
import { logUserActivity } from "@/lib/activity-logger";

interface MFADisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string | undefined;
  onSuccess: () => void;
}

export function MFADisableDialog({
  open,
  onOpenChange,
  factorId,
  onSuccess,
}: MFADisableDialogProps) {
  const { t } = useTranslation();
  const { unenroll, challenge, verify } = useMFA();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

  const handleClose = () => {
    setCode("");
    onOpenChange(false);
  };

  const handleDisable = async () => {
    if (!factorId || code.length !== 6) return;

    setLoading(true);

    // First verify the code to ensure user has access
    const challengeId = await challenge(factorId);
    if (!challengeId) {
      setLoading(false);
      return;
    }

    const verified = await verify(factorId, challengeId, code);
    if (!verified) {
      setLoading(false);
      setCode("");
      return;
    }

    // Now unenroll the factor
    const success = await unenroll(factorId);
    setLoading(false);

    if (success) {
      // Log MFA disabled event
      await logUserActivity({ eventType: 'mfa_disabled' });
      
      toast({
        title: t('mfaDisable.toastTitle'),
        description: t('mfaDisable.toastDescription'),
      });
      onSuccess();
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('mfaDisable.title')}</DialogTitle>
          <DialogDescription>
            {t('mfaDisable.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('mfaDisable.warning')}
            </AlertDescription>
          </Alert>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <ShieldOff className="h-8 w-8 text-destructive" />
            </div>
          </div>

          {/* OTP Input */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              {t('mfaDisable.enterCode')}
            </p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={loading}
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
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : null}
            {t('twoFactorSetup.disable2FA')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}