import { useTranslation } from 'react-i18next';
import { useModuleAccess } from '@/hooks/use-module-access';
import { Progress } from '@/components/ui/progress';
import { Users, AlertTriangle } from 'lucide-react';

interface UserLimitIndicatorProps {
  showLabel?: boolean;
  compact?: boolean;
}

export function UserLimitIndicator({ showLabel = true, compact = false }: UserLimitIndicatorProps) {
  const { t } = useTranslation();
  const { subscription, getUserLimitPercentage, hasReachedUserLimit } = useModuleAccess();

  if (!subscription) return null;

  const percentage = getUserLimitPercentage();
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className={isCritical ? 'text-destructive font-medium' : isWarning ? 'text-warning' : ''}>
          {subscription.currentUsers}/{subscription.maxUsers}
        </span>
        {isCritical && <AlertTriangle className="h-4 w-4 text-destructive" />}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('userLimit.title')}</span>
          <span className={isCritical ? 'text-destructive font-medium' : isWarning ? 'text-warning' : ''}>
            {subscription.currentUsers} / {subscription.maxUsers}
          </span>
        </div>
      )}
      <Progress 
        value={percentage} 
        className={`h-2 ${isCritical ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-warning' : ''}`}
      />
      {isCritical && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t('userLimit.limitReached')}
        </p>
      )}
    </div>
  );
}
