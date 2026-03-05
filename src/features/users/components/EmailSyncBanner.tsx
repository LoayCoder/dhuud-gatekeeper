import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';

interface MismatchedUser {
  user_id: string;
  full_name: string;
  profile_email: string;
  auth_email: string;
}

interface EmailSyncBannerProps {
  onSyncComplete?: () => void;
}

export function EmailSyncBanner({ onSyncComplete }: EmailSyncBannerProps) {
  const { t } = useTranslation();
  const [mismatches, setMismatches] = useState<MismatchedUser[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCompleted, setSyncCompleted] = useState(false);

  const checkMismatches = useCallback(async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-email-mismatches');
      
      if (error) {
        console.error('Error checking email mismatches:', error);
        return;
      }

      if (data?.mismatches) {
        setMismatches(data.mismatches);
      }
    } catch (err) {
      console.error('Failed to check email mismatches:', err);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkMismatches();
  }, [checkMismatches]);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-all-emails');
      
      if (error) {
        toast({
          title: t('common.error'),
          description: error.message || t('userManagement.syncAllFailed', 'Failed to sync emails'),
          variant: 'destructive',
        });
        return;
      }

      if (data?.synced_count > 0) {
        toast({
          title: t('userManagement.emailsSynced', 'Emails Synced'),
          description: t('userManagement.emailsSyncedDesc', '{{count}} login email(s) have been updated', { count: data.synced_count }),
        });
        setSyncCompleted(true);
        setMismatches([]);
        onSyncComplete?.();
      }

      if (data?.failed_count > 0) {
        toast({
          title: t('common.warning'),
          description: t('userManagement.someSyncsFailed', '{{count}} email sync(s) failed', { count: data.failed_count }),
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Sync all failed:', err);
      toast({
        title: t('common.error'),
        description: t('userManagement.syncAllFailed', 'Failed to sync emails'),
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show anything while checking or if no mismatches
  if (isChecking) {
    return null;
  }

  if (syncCompleted) {
    return (
      <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-start text-green-700 dark:text-green-400">
          {t('userManagement.syncComplete', 'Email Sync Complete')}
        </AlertTitle>
        <AlertDescription className="text-start text-green-600 dark:text-green-300">
          {t('userManagement.allEmailsSynced', 'All login emails have been synchronized with profile emails.')}
        </AlertDescription>
      </Alert>
    );
  }

  if (mismatches.length === 0) {
    return null;
  }

  return (
    <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-start text-amber-700 dark:text-amber-400">
        {t('userManagement.emailMismatchWarning', 'Email Mismatch Detected')}
      </AlertTitle>
      <AlertDescription className="text-start">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-amber-600 dark:text-amber-300">
            <p>
              {t('userManagement.emailMismatchDesc', '{{count}} user(s) have different login emails than their profile emails. This may cause login issues.', { count: mismatches.length })}
            </p>
            <ul className="mt-2 text-sm space-y-1">
              {mismatches.slice(0, 3).map((m) => (
                <li key={m.user_id}>
                  <strong>{m.full_name}</strong>: {m.auth_email} → {m.profile_email}
                </li>
              ))}
              {mismatches.length > 3 && (
                <li className="text-muted-foreground">
                  {t('common.andMore', 'and {{count}} more...', { count: mismatches.length - 3 })}
                </li>
              )}
            </ul>
          </div>
          <Button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="shrink-0"
            variant="default"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin me-2" />
                {t('common.syncing', 'Syncing...')}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 me-2" />
                {t('userManagement.syncAllEmails', 'Sync All Emails')}
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
