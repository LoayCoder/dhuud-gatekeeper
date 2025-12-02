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
import { ShieldCheck, Smartphone, Copy, Check, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { useMFA } from "@/hooks/useMFA";
import { toast } from "@/hooks/use-toast";
import { logUserActivity } from "@/lib/activity-logger";

interface MFAEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = "intro" | "qrcode" | "verify" | "success";

export function MFAEnrollDialog({ open, onOpenChange, onSuccess }: MFAEnrollDialogProps) {
  const { t } = useTranslation();
  const { enroll, verify, challenge } = useMFA();
  const [step, setStep] = useState<Step>("intro");
  const [loading, setLoading] = useState(false);
  const [enrollData, setEnrollData] = useState<{
    id: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setStep("intro");
    setEnrollData(null);
    setCode("");
    setCopied(false);
    onOpenChange(false);
  };

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
      setStep("qrcode");
    }
  };

  const handleVerify = async () => {
    if (!enrollData || code.length !== 6) return;

    setLoading(true);
    
    // Create challenge and verify
    const challengeId = await challenge(enrollData.id);
    if (!challengeId) {
      setLoading(false);
      return;
    }

    const success = await verify(enrollData.id, challengeId, code);
    setLoading(false);

    if (success) {
      setStep("success");
      onSuccess();
      
      // Log MFA enabled event
      await logUserActivity({ eventType: 'mfa_enabled' });
      
      toast({
        title: t('mfaEnroll.toastTitle'),
        description: t('mfaEnroll.toastDescription'),
      });
    } else {
      setCode("");
    }
  };

  const copySecret = () => {
    if (enrollData?.secret) {
      navigator.clipboard.writeText(enrollData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "intro" && (
          <>
            <DialogHeader>
              <DialogTitle>{t('mfaEnroll.title')}</DialogTitle>
              <DialogDescription>
                {t('mfaEnroll.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">{t('mfaEnroll.step1Title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('mfaEnroll.step1Description')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">{t('mfaEnroll.step2Title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('mfaEnroll.step2Description')}
                  </p>
                </div>
              </div>
              <Alert>
                <AlertDescription>
                  {t('mfaEnroll.phoneNearby')}
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleStartEnrollment} disabled={loading}>
                {loading ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : null}
                {t('common.continue')}
                <ChevronRight className="ms-2 h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          </>
        )}

        {step === "qrcode" && enrollData && (
          <>
            <DialogHeader>
              <DialogTitle>{t('mfaEnroll.scanTitle')}</DialogTitle>
              <DialogDescription>
                {t('mfaEnroll.scanDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="rounded-lg border bg-white p-4">
                  <img
                    src={enrollData.qrCode}
                    alt="QR Code for 2FA setup"
                    className="h-48 w-48"
                  />
                </div>
              </div>

              {/* Manual Setup Key */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  {t('mfaEnroll.cantScan')}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                    {enrollData.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("intro")}>
                <ChevronLeft className="me-2 h-4 w-4 rtl:rotate-180" />
                {t('common.back')}
              </Button>
              <Button onClick={() => setStep("verify")}>
                {t('common.continue')}
                <ChevronRight className="ms-2 h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          </>
        )}

        {step === "verify" && (
          <>
            <DialogHeader>
              <DialogTitle>{t('mfaEnroll.verifyTitle')}</DialogTitle>
              <DialogDescription>
                {t('mfaEnroll.verifyDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
              <p className="text-sm text-muted-foreground text-center">
                {t('mfaEnroll.codeRefreshes')}
              </p>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("qrcode")}>
                <ChevronLeft className="me-2 h-4 w-4 rtl:rotate-180" />
                {t('common.back')}
              </Button>
              <Button
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : null}
                {t('common.verify')}
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle>{t('mfaEnroll.successTitle')}</DialogTitle>
              <DialogDescription>
                {t('mfaEnroll.successDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-500/10 p-4">
                  <ShieldCheck className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <Alert>
                <AlertDescription>
                  {t('mfaEnroll.successAlert')}
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>{t('common.done')}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}