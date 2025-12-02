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
import { ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logUserActivity } from "@/lib/activity-logger";

interface MFAVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MFAVerificationDialog({
  open,
  onOpenChange,
  factorId,
  onSuccess,
  onCancel,
}: MFAVerificationDialogProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
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

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('mfaVerification.title')}</DialogTitle>
          <DialogDescription>
            {t('mfaVerification.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
          </div>

          {/* OTP Input */}
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

          <p className="text-sm text-muted-foreground text-center">
            {t('mfaVerification.openAuthenticator')}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            {t('mfaVerification.cancel')}
          </Button>
          <Button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
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