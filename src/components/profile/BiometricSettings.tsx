import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebAuthn } from '@/hooks/use-webauthn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Smartphone, Trash2, Plus, AlertCircle, Loader2 } from 'lucide-react';
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

export function BiometricSettings() {
  const { t } = useTranslation();
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            {t('biometric.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          {t('biometric.title')}
        </CardTitle>
        <CardDescription>
          {t('biometric.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupported ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('biometric.notSupported')}
            </AlertDescription>
          </Alert>
        ) : !isPlatformAvailable ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('biometric.noPlatformAuthenticator')}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Register Button */}
            <Button
              onClick={handleRegister}
              disabled={isRegistering}
              className="w-full"
              variant="outline"
            >
              {isRegistering ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Plus className="h-4 w-4 me-2" />
              )}
              {t('biometric.register')}
            </Button>

            {/* Registered Devices */}
            {credentials.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t('biometric.registeredDevices')}
                </h4>
                {credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {cred.device_name || t('biometric.unknownDevice')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('biometric.registeredOn')} {format(new Date(cred.created_at), 'PPp')}
                        </p>
                        {cred.last_used_at && (
                          <p className="text-xs text-muted-foreground">
                            {t('biometric.lastUsed')} {format(new Date(cred.last_used_at), 'PPp')}
                          </p>
                        )}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          disabled={removingId === cred.id}
                        >
                          {removingId === cred.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
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
              <div className="text-center py-6 text-muted-foreground">
                <Fingerprint className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('biometric.noDevices')}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
