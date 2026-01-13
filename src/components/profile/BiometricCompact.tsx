import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebAuthn } from '@/hooks/use-webauthn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Smartphone, Trash2, Plus, AlertCircle, Loader2, HelpCircle, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface BiometricCompactProps {
  onCredentialCountChange?: (count: number) => void;
}

export function BiometricCompact({ onCredentialCountChange }: BiometricCompactProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const {
    isSupported,
    isPlatformAvailable,
    credentials,
    isLoading,
    registerCredential,
    removeCredential,
  } = useWebAuthn();
  const [isRegistering, setIsRegistering] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Notify parent of credential count changes
  useState(() => {
    onCredentialCountChange?.(credentials.length);
  });

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      await registerCredential();
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await removeCredential(id);
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSupported) {
    return (
      <Alert variant="destructive" className="py-2">
        <AlertCircle className="h-3.5 w-3.5" />
        <AlertDescription className="text-xs">
          {t('biometric.notSupported')}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isPlatformAvailable) {
    return (
      <Alert className="py-2">
        <AlertCircle className="h-3.5 w-3.5" />
        <AlertDescription className="text-xs">
          {t('biometric.noPlatformAuthenticator')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2" dir={direction}>
      {/* Registered Devices */}
      {credentials.length > 0 ? (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30"
            >
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg p-1.5 bg-primary/10">
                  <Smartphone className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="text-start">
                  <p className="font-medium text-xs">
                    {cred.device_name || t('biometric.unknownDevice')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(cred.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={removingId === cred.id}
                  >
                    {removingId === cred.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('biometric.removeTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('biometric.removeDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemove(cred.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('common.remove')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          <Fingerprint className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('biometric.noDevices')}</p>
        </div>
      )}

      {/* Register Button */}
      <Button
        onClick={handleRegister}
        disabled={isRegistering}
        variant="outline"
        size="sm"
        className="w-full h-8"
      >
        {isRegistering ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />
        ) : (
          <Plus className="h-3.5 w-3.5 me-1.5" />
        )}
        {t('biometric.register')}
      </Button>

      {/* Compact Help */}
      <Collapsible open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between text-muted-foreground hover:text-foreground h-8 text-xs"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="h-3 w-3" />
              {t('biometric.helpTitle', 'Need Help?')}
            </span>
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform",
              isHelpOpen && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2 text-xs text-muted-foreground">
          <div className="p-2 rounded-lg bg-muted/50 space-y-1">
            <h5 className="font-medium text-foreground text-[11px]">{t('biometric.helpTroubleshootTitle', 'Troubleshooting:')}</h5>
            <ul className="list-disc list-inside space-y-0.5 ps-1 text-[11px]">
              <li>{t('biometric.helpTroubleshoot1', 'Clear old passkeys from device settings')}</li>
              <li>{t('biometric.helpTroubleshoot4', 'Ensure fingerprint or face unlock is set up')}</li>
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
