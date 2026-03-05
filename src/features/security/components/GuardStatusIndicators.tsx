import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Battery, BatteryLow, BatteryWarning as BatteryWarningIcon, Wifi, WifiOff, Navigation, NavigationOff, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuardStatusIndicatorsProps {
  batteryLevel: number | null;
  gpsAccuracy: number | null;
  isOnline: boolean;
  lastUpdate?: Date;
  className?: string;
}

export function GuardStatusIndicators({
  batteryLevel,
  gpsAccuracy,
  isOnline,
  lastUpdate,
  className,
}: GuardStatusIndicatorsProps) {
  const { t } = useTranslation();

  const getBatteryIcon = () => {
    if (batteryLevel === null) return Battery;
    if (batteryLevel <= 15) return BatteryLow;
    if (batteryLevel <= 30) return BatteryWarningIcon;
    return Battery;
  };

  const getBatteryColor = () => {
    if (batteryLevel === null) return 'text-muted-foreground';
    if (batteryLevel <= 15) return 'text-destructive';
    if (batteryLevel <= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getGpsQuality = () => {
    if (gpsAccuracy === null) return { label: t('security.status.noGps', 'No GPS'), color: 'text-muted-foreground', quality: 'none' };
    if (gpsAccuracy <= 5) return { label: t('security.status.excellent', 'Excellent'), color: 'text-green-500', quality: 'excellent' };
    if (gpsAccuracy <= 10) return { label: t('security.status.good', 'Good'), color: 'text-green-500', quality: 'good' };
    if (gpsAccuracy <= 25) return { label: t('security.status.fair', 'Fair'), color: 'text-yellow-500', quality: 'fair' };
    return { label: t('security.status.poor', 'Poor'), color: 'text-destructive', quality: 'poor' };
  };

  const BatteryIcon = getBatteryIcon();
  const gpsQuality = getGpsQuality();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Battery Status */}
      <Badge 
        variant="outline" 
        className={cn("flex items-center gap-1", getBatteryColor())}
      >
        <BatteryIcon className="h-3 w-3" />
        {batteryLevel !== null ? `${batteryLevel}%` : '--'}
      </Badge>

      {/* GPS Accuracy */}
      <Badge 
        variant="outline" 
        className={cn("flex items-center gap-1", gpsQuality.color)}
      >
        {gpsAccuracy !== null ? (
          <Navigation className="h-3 w-3" />
        ) : (
          <NavigationOff className="h-3 w-3" />
        )}
        {gpsAccuracy !== null ? `±${gpsAccuracy.toFixed(0)}m` : '--'}
      </Badge>

      {/* Connection Status */}
      <Badge 
        variant="outline" 
        className={cn(
          "flex items-center gap-1",
          isOnline ? "text-green-500" : "text-destructive"
        )}
      >
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            {t('security.status.online', 'Online')}
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            {t('security.status.offline', 'Offline')}
          </>
        )}
      </Badge>

      {/* Signal Strength (if we have GPS quality) */}
      {gpsAccuracy !== null && (
        <Badge 
          variant="outline" 
          className={cn("flex items-center gap-1 text-xs", gpsQuality.color)}
        >
          <Signal className="h-3 w-3" />
          {gpsQuality.label}
        </Badge>
      )}
    </div>
  );
}

interface BatteryWarningProps {
  level: number | null;
}

export function BatteryWarning({ level }: BatteryWarningProps) {
  const { t } = useTranslation();

  if (level === null || level > 20) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg text-sm",
      level <= 10 
        ? "bg-destructive/10 text-destructive border border-destructive/20" 
        : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20"
    )}>
      <BatteryLow className="h-5 w-5" />
      <div>
        <p className="font-medium">
          {level <= 10 
            ? t('security.status.batteryCritical', 'Battery Critical!')
            : t('security.status.batteryLow', 'Low Battery')
          }
        </p>
        <p className="text-xs opacity-80">
          {level <= 10
            ? t('security.status.chargeSoon', 'Please charge your device immediately')
            : t('security.status.chargeWhenPossible', 'Consider charging when possible')
          }
        </p>
      </div>
    </div>
  );
}
