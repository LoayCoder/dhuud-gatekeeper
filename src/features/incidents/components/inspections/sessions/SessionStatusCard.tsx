import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertTriangle, Lock, Play, XCircle, RotateCcw } from 'lucide-react';
import { SessionClosureStatus } from '@/hooks/use-session-lifecycle';

interface SessionStatusCardProps {
  status: string;
  closureStatus: SessionClosureStatus | undefined;
  isLoading: boolean;
  onComplete: () => void;
  onClose: () => void;
  onStart?: () => void;
  onReopen?: () => void;
  isCompleting: boolean;
  isClosing: boolean;
  isReopening?: boolean;
}

export function SessionStatusCard({
  status,
  closureStatus,
  isLoading,
  onComplete,
  onClose,
  onStart,
  onReopen,
  isCompleting,
  isClosing,
  isReopening,
}: SessionStatusCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const getStatusBadge = () => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">{t('inspections.session.statusDraft')}</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500 text-white">{t('inspections.session.statusInProgress')}</Badge>;
      case 'completed_with_open_actions':
        return <Badge className="bg-amber-500 text-white">{t('inspections.session.statusCompleted')}</Badge>;
      case 'closed':
        return <Badge variant="outline" className="border-green-500 text-green-600">{t('inspections.session.statusClosed')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const progressPercentage = closureStatus 
    ? (closureStatus.responded_items / Math.max(closureStatus.total_items, 1)) * 100
    : 0;

  return (
    <Card dir={direction}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('inspections.session.status')}</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : closureStatus ? (
          <>
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('inspections.session.itemsProgress')}</span>
                <span className="font-medium">
                  {closureStatus.responded_items}/{closureStatus.total_items}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Findings info */}
            {closureStatus.total_findings > 0 && (
              <div className="flex items-center gap-2 text-sm">
                {closureStatus.open_findings > 0 ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-amber-600">
                      {t('inspections.session.findingsOpen', { count: closureStatus.open_findings })}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">{t('inspections.session.actionsVerified')}</span>
                  </>
                )}
              </div>
            )}

            {/* Blocking reasons */}
            {status === 'completed_with_open_actions' && !closureStatus.can_close && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-700 dark:text-amber-400">
                      {t('inspections.session.cannotClose')}
                    </p>
                    {closureStatus.pending_actions.length > 0 && (
                      <ul className="mt-1 text-amber-600 dark:text-amber-500 list-disc list-inside">
                        {closureStatus.pending_actions.slice(0, 3).map((action) => (
                          <li key={action.finding_id} className="truncate">
                            {action.finding_ref}: {action.action_title || t('inspections.session.noActionAssigned')}
                          </li>
                        ))}
                        {closureStatus.pending_actions.length > 3 && (
                          <li>+{closureStatus.pending_actions.length - 3} {t('common.more')}</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Closed banner with reopen option */}
            {status === 'closed' && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('inspections.session.sessionLocked')}</span>
                </div>
                {onReopen && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onReopen}
                    disabled={isReopening}
                    className="w-full"
                  >
                    {isReopening ? (
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full me-2" />
                    ) : (
                      <RotateCcw className="h-4 w-4 me-2" />
                    )}
                    {t('inspections.session.reopenSession')}
                  </Button>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {status === 'draft' && onStart && (
                <Button onClick={onStart} className="flex-1">
                  <Play className="h-4 w-4 me-2" />
                  {t('inspections.session.start')}
                </Button>
              )}
              
              {status === 'in_progress' && closureStatus.all_items_responded && (
                <Button 
                  onClick={onComplete} 
                  disabled={isCompleting}
                  className="flex-1"
                >
                  {isCompleting ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full me-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 me-2" />
                  )}
                  {t('inspections.session.complete')}
                </Button>
              )}
              
              {status === 'completed_with_open_actions' && (
                <Button 
                  onClick={onClose} 
                  disabled={isClosing || !closureStatus.can_close}
                  className="flex-1"
                  variant={closureStatus.can_close ? 'default' : 'secondary'}
                >
                  {isClosing ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full me-2" />
                  ) : closureStatus.can_close ? (
                    <Lock className="h-4 w-4 me-2" />
                  ) : (
                    <XCircle className="h-4 w-4 me-2" />
                  )}
                  {t('inspections.session.close')}
                </Button>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
