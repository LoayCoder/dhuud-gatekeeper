import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Lock, FileText } from 'lucide-react';
import { SessionClosureStatus } from '@/hooks/use-session-lifecycle';

interface SessionCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'complete' | 'close';
  closureStatus: SessionClosureStatus | undefined;
  onConfirm: () => void;
  isLoading: boolean;
}

export function SessionCompletionDialog({
  open,
  onOpenChange,
  mode,
  closureStatus,
  onConfirm,
  isLoading,
}: SessionCompletionDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const isComplete = mode === 'complete';
  const title = isComplete 
    ? t('inspections.session.confirmComplete')
    : t('inspections.session.confirmClose');

  const hasWarnings = closureStatus && (
    (isComplete && !closureStatus.all_items_responded) ||
    (!isComplete && closureStatus.open_findings > 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={direction} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle className="h-5 w-5 text-primary" />
            ) : (
              <Lock className="h-5 w-5 text-primary" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            {isComplete 
              ? t('inspections.session.completeDescription')
              : t('inspections.session.closeDescription')
            }
          </DialogDescription>
        </DialogHeader>

        {closureStatus && (
          <div className="space-y-4 py-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('inspections.session.itemsLabel')}</p>
                  <p className="font-medium">
                    {closureStatus.responded_items}/{closureStatus.total_items}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('findings.title')}</p>
                  <p className="font-medium">
                    {closureStatus.total_findings} ({closureStatus.open_findings} {t('findings.statusOpen')})
                  </p>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {hasWarnings && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="text-sm text-amber-700 dark:text-amber-400">
                    {isComplete && !closureStatus.all_items_responded && (
                      <p>{t('inspections.session.warningItemsIncomplete')}</p>
                    )}
                    {!isComplete && closureStatus.open_findings > 0 && (
                      <p>{t('inspections.session.warningOpenFindings')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pending actions list for close mode */}
            {!isComplete && closureStatus.pending_actions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('inspections.session.pendingActions')}</p>
                <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                  {closureStatus.pending_actions.map((action) => (
                    <li key={action.finding_id} className="flex items-center gap-2">
                      <span className="font-mono text-xs">{action.finding_ref}</span>
                      <span>-</span>
                      <span className="truncate">{action.action_title || t('inspections.session.noActionAssigned')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isLoading || (!isComplete && closureStatus && !closureStatus.can_close)}
          >
            {isLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full me-2" />
            ) : null}
            {isComplete ? t('inspections.session.complete') : t('inspections.session.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
