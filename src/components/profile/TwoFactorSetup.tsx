import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Shield, Loader2 } from "lucide-react";
import { useMFA } from "@/hooks/useMFA";
import { useMFABackupCodes } from "@/hooks/use-mfa-backup-codes";
import { MFAEnrollDialog } from "./MFAEnrollDialog";
import { MFADisableDialog } from "./MFADisableDialog";
import { BackupCodesDialog, BackupCodesStatus } from "./BackupCodesDialog";
import { toast } from "@/hooks/use-toast";

export function TwoFactorSetup() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { isEnabled, isLoading, factors, refreshFactors } = useMFA();
  const { status, fetchStatus, generateCodes, isLoading: backupLoading } = useMFABackupCodes();
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [backupCodesDialogOpen, setBackupCodesDialogOpen] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);

  // Fetch backup code status when MFA is enabled
  useEffect(() => {
    if (isEnabled && !isLoading) {
      fetchStatus();
    }
  }, [isEnabled, isLoading, fetchStatus]);

  const handleRegenerate = async () => {
    if (!confirm(t('backupCodes.regenerateConfirm'))) return;
    
    const codes = await generateCodes();
    if (codes) {
      setNewBackupCodes(codes);
      setBackupCodesDialogOpen(true);
    } else {
      toast({
        title: t('common.error'),
        description: t('backupCodes.regenerate'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={direction}>
      {/* Status Display */}
      <div className="flex items-start gap-4">
        <div className={`rounded-full p-3 flex-shrink-0 ${isEnabled ? 'bg-green-500/10' : 'bg-muted'}`}>
          {isEnabled ? <ShieldCheck className="h-6 w-6 text-green-600" /> : <Shield className="h-6 w-6 text-muted-foreground" />}
        </div>
        <div className="flex-1 space-y-1 text-start">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{t('twoFactorSetup.twoFactorAuth')}</h4>
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? t('twoFactorSetup.enabled') : t('twoFactorSetup.disabled')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground text-start">
            {isEnabled ? t('twoFactorSetup.enabledMessage') : t('twoFactorSetup.disabledMessage')}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end">
        {isEnabled ? (
          <Button variant="outline" onClick={() => setDisableDialogOpen(true)} className="text-destructive hover:text-destructive">
            {t('twoFactorSetup.disable2FA')}
          </Button>
        ) : (
          <Button onClick={() => setEnrollDialogOpen(true)}>
            {t('twoFactorSetup.enable2FA')}
          </Button>
        )}
      </div>

      {/* Backup Codes Section (only when MFA is enabled) */}
      {isEnabled && status && (
        <>
          <Separator />
          <BackupCodesStatus
            remaining={status.remaining}
            total={status.total}
            onRegenerate={handleRegenerate}
            isLoading={backupLoading}
          />
        </>
      )}

      {/* Dialogs */}
      <MFAEnrollDialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen} onSuccess={refreshFactors} />
      
      <MFADisableDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen} factorId={factors[0]?.id} onSuccess={refreshFactors} />

      <BackupCodesDialog
        open={backupCodesDialogOpen}
        onOpenChange={setBackupCodesDialogOpen}
        codes={newBackupCodes}
        isNewCodes={true}
      />
    </div>
  );
}
