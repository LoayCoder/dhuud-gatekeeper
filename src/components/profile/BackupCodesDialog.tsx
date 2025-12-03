import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Download, AlertTriangle, Key, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BackupCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codes: string[];
  isNewCodes?: boolean;
}

export function BackupCodesDialog({ open, onOpenChange, codes, isNewCodes = true }: BackupCodesDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const codesText = codes.join('\n');
    await navigator.clipboard.writeText(codesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: t('backupCodes.copied'),
      description: t('backupCodes.copiedDescription'),
    });
  };

  const handleDownload = () => {
    const codesText = `MFA Backup Codes\n${'='.repeat(20)}\n\n${codes.join('\n')}\n\n⚠️ Each code can only be used once.\n⚠️ Store these codes securely.\n⚠️ Generate new codes if these are compromised.`;
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: t('backupCodes.downloaded'),
      description: t('backupCodes.downloadedDescription'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            {t('backupCodes.title')}
          </DialogTitle>
          <DialogDescription>
            {isNewCodes 
              ? t('backupCodes.newCodesDescription')
              : t('backupCodes.description')
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isNewCodes && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('backupCodes.warning')}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-4">
            {codes.map((code, index) => (
              <code key={index} className="font-mono text-sm text-center py-1 bg-background rounded">
                {code}
              </code>
            ))}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {t('backupCodes.eachCodeOnce')}
          </p>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 me-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 me-2" />
              )}
              {t('common.copy')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleDownload}>
              <Download className="h-4 w-4 me-2" />
              {t('backupCodes.download')}
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            {t('backupCodes.iSavedThem')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BackupCodesStatusProps {
  remaining: number;
  total: number;
  onRegenerate: () => void;
  isLoading?: boolean;
}

export function BackupCodesStatus({ remaining, total, onRegenerate, isLoading }: BackupCodesStatusProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-3">
        <Key className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{t('backupCodes.title')}</p>
          <p className="text-xs text-muted-foreground">
            {t('backupCodes.remainingCodes', { remaining, total })}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          t('backupCodes.regenerate')
        )}
      </Button>
    </div>
  );
}
