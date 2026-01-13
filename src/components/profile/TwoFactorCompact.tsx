import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Shield, Loader2, KeyRound, RefreshCw } from "lucide-react";
import { useMFA } from "@/hooks/useMFA";
import { useMFABackupCodes } from "@/hooks/use-mfa-backup-codes";
import { MFAEnrollDialog } from "./MFAEnrollDialog";
import { MFADisableDialog } from "./MFADisableDialog";
import { BackupCodesDialog } from "./BackupCodesDialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TwoFactorCompactProps {
  onStatusChange?: (enabled: boolean) => void;
}

export function TwoFactorCompact({ onStatusChange }: TwoFactorCompactProps) {
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

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(isEnabled);
  }, [isEnabled, onStatusChange]);

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
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3" dir={direction}>
      {/* 2FA Status Row */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={cn(
            "rounded-lg p-2",
            isEnabled ? "bg-green-500/10" : "bg-muted"
          )}>
            {isEnabled ? (
              <ShieldCheck className="h-4 w-4 text-green-600" />
            ) : (
              <Shield className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="text-start">
            <p className="font-medium text-sm">{t('twoFactorSetup.authenticatorApp')}</p>
            <p className="text-xs text-muted-foreground">
              {isEnabled ? t('twoFactorSetup.enabledMessage') : t('twoFactorSetup.disabledMessage')}
            </p>
          </div>
        </div>
        {isEnabled ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setDisableDialogOpen(true)} 
            className="text-destructive hover:text-destructive h-8"
          >
            {t('common.disable')}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setEnrollDialogOpen(true)} className="h-8">
            {t('common.enable')}
          </Button>
        )}
      </div>

      {/* Backup Codes Row (only when MFA is enabled) */}
      {isEnabled && status && (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={cn(
              "rounded-lg p-2",
              status.remaining > 2 ? "bg-muted" : "bg-amber-500/10"
            )}>
              <KeyRound className={cn(
                "h-4 w-4",
                status.remaining > 2 ? "text-muted-foreground" : "text-amber-600"
              )} />
            </div>
            <div className="text-start">
              <p className="font-medium text-sm">{t('backupCodes.title')}</p>
              <p className={cn(
                "text-xs",
                status.remaining <= 2 ? "text-amber-600" : "text-muted-foreground"
              )}>
                {status.remaining} {t('backupCodes.of')} {status.total} {t('backupCodes.remaining')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setNewBackupCodes([]);
                setBackupCodesDialogOpen(true);
              }}
              className="h-8 text-xs"
            >
              {t('common.view')}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRegenerate}
              disabled={backupLoading}
              className="h-8"
            >
              {backupLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <MFAEnrollDialog 
        open={enrollDialogOpen} 
        onOpenChange={setEnrollDialogOpen} 
        onSuccess={refreshFactors} 
      />
      
      <MFADisableDialog 
        open={disableDialogOpen} 
        onOpenChange={setDisableDialogOpen} 
        factorId={factors[0]?.id} 
        onSuccess={refreshFactors} 
      />

      <BackupCodesDialog
        open={backupCodesDialogOpen}
        onOpenChange={setBackupCodesDialogOpen}
        codes={newBackupCodes}
        isNewCodes={newBackupCodes.length > 0}
      />
    </div>
  );
}
