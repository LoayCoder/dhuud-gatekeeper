import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

interface OfflineAccessNoticeProps {
  reason?: 'mfa_required' | 'session_expired' | 'general';
  onRetry?: () => void;
}

export function OfflineAccessNotice({ reason = 'general', onRetry }: OfflineAccessNoticeProps) {
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
    setRetrying(false);
  };

  const getContent = () => {
    switch (reason) {
      case 'mfa_required':
        return {
          icon: Shield,
          title: t('offline.mfaRequired', 'Authentication Required'),
          description: t('offline.mfaRequiredDesc', 'Two-factor authentication verification requires an internet connection.'),
        };
      case 'session_expired':
        return {
          icon: WifiOff,
          title: t('offline.sessionExpired', 'Session Verification Needed'),
          description: t('offline.sessionExpiredDesc', 'Please connect to the internet to verify your session.'),
        };
      default:
        return {
          icon: WifiOff,
          title: t('offline.noConnection', 'No Internet Connection'),
          description: t('offline.noConnectionDesc', 'Some features require an internet connection to work.'),
        };
    }
  };

  const content = getContent();
  const IconComponent = content.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <IconComponent className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>{content.title}</CardTitle>
          <CardDescription className="mt-2">
            {content.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="text-center">
              {t('offline.cachedDataAvailable', 'Your previously loaded data may still be available once you reconnect.')}
            </p>
          </div>
          
          <Button 
            onClick={handleRetry} 
            className="w-full"
            disabled={retrying}
          >
            {retrying ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <RefreshCw className="h-4 w-4 me-2" />
            )}
            {t('offline.retry', 'Retry Connection')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
