import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CloudSun, Gavel, ShieldAlert, BookOpen, GraduationCap, Bell, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHSSENotificationsUser, HSSENotification } from '@/hooks/use-hsse-notifications';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS = {
  weather_risk: CloudSun,
  regulation: Gavel,
  safety_alert: ShieldAlert,
  policy_update: BookOpen,
  training: GraduationCap,
  general: Bell,
};

const PRIORITY_COLORS = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-muted text-muted-foreground',
};

export function MandatoryNotificationDialog() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { pendingMandatory, acknowledgeNotification, getLocalizedTitle, getLocalizedBody } = useHSSENotificationsUser();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasReadConfirmation, setHasReadConfirmation] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Don't show if no pending mandatory notifications
  if (!pendingMandatory || pendingMandatory.length === 0) {
    return null;
  }

  const currentNotification = pendingMandatory[currentIndex] as HSSENotification;
  const CategoryIcon = CATEGORY_ICONS[currentNotification.category] || Bell;
  const totalCount = pendingMandatory.length;

  const handleAcknowledge = async () => {
    if (!hasReadConfirmation) return;
    
    setIsAcknowledging(true);
    try {
      await acknowledgeNotification.mutateAsync(currentNotification.id);
      
      // Move to next notification or close if done
      if (currentIndex < totalCount - 1) {
        setCurrentIndex(prev => prev + 1);
        setHasReadConfirmation(false);
      }
      // If this was the last one, the dialog will auto-close because pendingMandatory will be empty
    } finally {
      setIsAcknowledging(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-hidden [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-start">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full",
                currentNotification.priority === 'critical' ? 'bg-destructive/10' : 'bg-warning/10'
              )}>
                <CategoryIcon className={cn(
                  "h-6 w-6",
                  currentNotification.priority === 'critical' ? 'text-destructive' : 'text-warning'
                )} />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {t('hsseNotifications.mandatoryNotice')}
                </DialogTitle>
                <DialogDescription className="text-start">
                  {t('hsseNotifications.pleaseAcknowledge')}
                </DialogDescription>
              </div>
            </div>
            
            {totalCount > 1 && (
              <Badge variant="secondary" className="shrink-0">
                {currentIndex + 1} / {totalCount}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Priority and Category badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={cn(PRIORITY_COLORS[currentNotification.priority])}>
              {t(`hsseNotifications.priority.${currentNotification.priority}`)}
            </Badge>
            <Badge variant="outline">
              {t(`hsseNotifications.category.${currentNotification.category}`)}
            </Badge>
          </div>

          {/* Notification Title */}
          <h3 className="text-lg font-semibold">
            {getLocalizedTitle(currentNotification)}
          </h3>

          {/* Notification Body */}
          <ScrollArea className="h-[200px] rounded-md border p-4 bg-muted/30">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {getLocalizedBody(currentNotification)}
            </div>
          </ScrollArea>

          {/* Acknowledgment checkbox */}
          <div className="flex items-start gap-3 p-4 rounded-lg border bg-accent/50">
            <Checkbox
              id="acknowledge-checkbox"
              checked={hasReadConfirmation}
              onCheckedChange={(checked) => setHasReadConfirmation(checked === true)}
              className="mt-0.5"
            />
            <Label 
              htmlFor="acknowledge-checkbox" 
              className="text-sm font-medium leading-relaxed cursor-pointer"
            >
              {t('hsseNotifications.confirmRead')}
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button
            onClick={handleAcknowledge}
            disabled={!hasReadConfirmation || isAcknowledging}
            className="min-w-[140px]"
          >
            {isAcknowledging ? (
              <>
                <span className="animate-spin me-2">⏳</span>
                {t('common.processing')}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 me-2" />
                {t('hsseNotifications.iAcknowledge')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
