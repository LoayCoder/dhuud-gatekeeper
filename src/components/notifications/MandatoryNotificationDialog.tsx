import { useTranslation } from 'react-i18next';
import { AlertTriangle, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useHSSENotificationsUser } from '@/features/incidents/hooks/use-hsse-notifications';

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'border-destructive/50 bg-destructive/5',
  high: 'border-destructive/30 bg-destructive/5',
  medium: 'border-warning/30 bg-warning/5',
  low: 'border-border',
};

export function MandatoryNotificationDialog() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const {
    pendingMandatory,
    pendingMandatoryCount,
    acknowledgeNotification,
    getLocalizedTitle,
    getLocalizedBody,
  } = useHSSENotificationsUser();

  if (pendingMandatoryCount === 0) return null;

  // Show first pending mandatory notification
  const current = pendingMandatory?.[0];
  if (!current) return null;

  const title = current.title_ar && i18n.language === 'ar' ? current.title_ar : current.title_en;
  const body = current.body_ar && i18n.language === 'ar' ? current.body_ar : current.body_en;

  const handleAcknowledge = () => {
    acknowledgeNotification.mutate(current.id);
  };

  return (
    <AlertDialog open>
      <AlertDialogContent
        dir={direction}
        className={cn('max-w-md', PRIORITY_STYLES[current.priority] || '')}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            {current.priority === 'critical' || current.priority === 'high' ? (
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            ) : (
              <Shield className="h-5 w-5 text-primary flex-shrink-0" />
            )}
            <Badge
              variant={current.priority === 'critical' || current.priority === 'high' ? 'destructive' : 'secondary'}
              className="text-[10px]"
            >
              {t(`hsseNotifications.priorities.${current.priority}`, current.priority)}
            </Badge>
            {pendingMandatoryCount > 1 && (
              <span className="text-xs text-muted-foreground ms-auto">
                1 / {pendingMandatoryCount}
              </span>
            )}
          </div>
          <AlertDialogTitle className="text-start">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-start whitespace-pre-wrap">
            {body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            onClick={handleAcknowledge}
            disabled={acknowledgeNotification.isPending}
            className="min-h-[44px] w-full sm:w-auto"
          >
            {acknowledgeNotification.isPending
              ? t('common.loading', 'Loading...')
              : t('hsseNotifications.acknowledgeAction', 'I Acknowledge')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
