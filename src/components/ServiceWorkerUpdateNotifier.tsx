import { useTranslation } from 'react-i18next';
import { RefreshCw, X, AlertTriangle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppUpdateCheck } from '@/hooks/use-app-update-check';
import { WhatsNewDialog } from '@/components/WhatsNewDialog';
import { cn } from '@/lib/utils';

export function ServiceWorkerUpdateNotifier() {
  const { t } = useTranslation();
  const {
    hasUpdate,
    newVersion,
    releaseNotes,
    priority,
    isIOS,
    isPWA,
    dismissCount,
    applyUpdate,
    dismissUpdate,
    currentVersion,
  } = useAppUpdateCheck();

  // Determine if this is a critical update (3+ dismissals or marked as critical)
  const isCritical = priority === 'critical' || dismissCount >= 3;
  const isImportant = priority === 'important' || dismissCount >= 2;

  if (!hasUpdate) {
    return (
      <WhatsNewDialog 
        version={currentVersion || ''} 
        releaseNotes={releaseNotes} 
      />
    );
  }

  return (
    <>
      <div className={cn(
        "fixed bottom-4 z-50 animate-in slide-in-from-bottom-4 duration-300",
        "inset-x-4 sm:inset-x-auto sm:end-4 sm:max-w-sm"
      )}>
        <div className={cn(
          "rounded-lg shadow-lg p-4",
          isCritical 
            ? "bg-destructive text-destructive-foreground" 
            : isImportant 
              ? "bg-yellow-500 text-yellow-950 dark:bg-yellow-600 dark:text-yellow-50"
              : "bg-primary text-primary-foreground"
        )}>
          <div className="flex items-start gap-3">
            {isCritical ? (
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            ) : isIOS && isPWA ? (
              <Smartphone className="h-5 w-5 mt-0.5 flex-shrink-0" />
            ) : (
              <RefreshCw className="h-5 w-5 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {isCritical 
                  ? t('pwa.updateCritical') 
                  : isImportant 
                    ? t('pwa.updateImportant')
                    : t('pwa.updateAvailable')
                }
              </p>
              <p className="text-xs opacity-90 mt-1">
                {isIOS && isPWA 
                  ? t('pwa.iosUpdateInstructions')
                  : t('pwa.updateDescription')
                }
              </p>
              {newVersion && (
                <p className="text-xs opacity-75 mt-1">
                  {t('pwa.version')}: {newVersion}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={applyUpdate}
                  className="text-xs"
                >
                  {t('pwa.updateNow')}
                </Button>
                {!isCritical && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissUpdate(false)}
                      className={cn(
                        "text-xs",
                        isCritical 
                          ? "text-destructive-foreground hover:text-destructive-foreground hover:bg-destructive-foreground/10"
                          : isImportant
                            ? "text-yellow-950 hover:text-yellow-950 hover:bg-yellow-950/10 dark:text-yellow-50 dark:hover:text-yellow-50 dark:hover:bg-yellow-50/10"
                            : "text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
                      )}
                    >
                      {t('pwa.remindLater')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissUpdate(true)}
                      className={cn(
                        "text-xs",
                        isCritical 
                          ? "text-destructive-foreground hover:text-destructive-foreground hover:bg-destructive-foreground/10"
                          : isImportant
                            ? "text-yellow-950 hover:text-yellow-950 hover:bg-yellow-950/10 dark:text-yellow-50 dark:hover:text-yellow-50 dark:hover:bg-yellow-50/10"
                            : "text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
                      )}
                    >
                      {t('pwa.dontRemindToday')}
                    </Button>
                  </>
                )}
              </div>
            </div>
            {!isCritical && (
              <button
                onClick={() => dismissUpdate(false)}
                className={cn(
                  "opacity-70 hover:opacity-100",
                  isCritical 
                    ? "text-destructive-foreground"
                    : isImportant
                      ? "text-yellow-950 dark:text-yellow-50"
                      : "text-primary-foreground"
                )}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <WhatsNewDialog 
        version={currentVersion || ''} 
        releaseNotes={releaseNotes} 
      />
    </>
  );
}
