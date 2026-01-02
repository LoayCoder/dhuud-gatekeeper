import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldX, Clock, MapPin, X, Bell, Zap, IdCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { differenceInHours, differenceInMinutes, addHours } from 'date-fns';
import type { GateAlert } from '@/hooks/use-gate-guard-stats';

interface GateAlertCardsProps {
  alerts: GateAlert[];
  onDismiss?: (alertId: string) => void;
  onAcknowledge?: (alertId: string) => void;
}

const alertIcons = {
  expired_permit: Clock,
  blacklist_match: ShieldX,
  induction_expired: AlertTriangle,
  geofence_breach: MapPin,
  pending_approval: Bell,
};

const alertConfigs = {
  critical: {
    border: 'border-destructive/40',
    bg: 'bg-gradient-to-br from-destructive/10 to-destructive/5',
    avatarBorder: 'ring-2 ring-destructive/50',
  },
  warning: {
    border: 'border-amber-500/40',
    bg: 'bg-gradient-to-br from-amber-500/10 to-amber-500/5',
    avatarBorder: 'ring-2 ring-amber-500/50',
  },
  info: {
    border: 'border-primary/40',
    bg: 'bg-gradient-to-br from-primary/10 to-primary/5',
    avatarBorder: 'ring-2 ring-primary/50',
  },
};

const getTimeRemaining = (timestamp: string) => {
  const alertTime = new Date(timestamp);
  const expiryTime = addHours(alertTime, 24);
  const now = new Date();

  if (now >= expiryTime) return { hours: 0, minutes: 0, expired: true };

  const totalMinutes = differenceInMinutes(expiryTime, now);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { hours, minutes, expired: false };
};

const getCountdownStyle = (hours: number) => {
  if (hours < 2) return 'bg-destructive/20 text-destructive';
  if (hours < 6) return 'bg-amber-500/20 text-amber-600 dark:text-amber-400';
  return 'bg-muted text-muted-foreground';
};

export function GateAlertCards({ alerts, onDismiss }: GateAlertCardsProps) {
  const { t } = useTranslation();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-3">
        {alerts.map((alert, index) => {
          const Icon = alertIcons[alert.type] || AlertTriangle;
          const config = alertConfigs[alert.severity];
          const timeRemaining = getTimeRemaining(alert.timestamp);
          const initials = alert.personName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

          // Don't render expired alerts
          if (timeRemaining.expired) return null;

          return (
            <Card
              key={alert.id}
              className={cn(
                'min-w-[220px] max-w-[260px] flex-shrink-0 border overflow-hidden transition-all duration-200 hover:shadow-md animate-fade-in',
                config.border,
                config.bg
              )}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-3">
                {/* Top Row: Severity + Countdown + Dismiss */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                      className={cn(
                        'text-[10px] px-1.5 py-0 h-5 font-semibold uppercase',
                        alert.severity === 'critical' && 'animate-pulse',
                        alert.severity === 'warning' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-0'
                      )}
                    >
                      {alert.severity === 'critical' && <Zap className="h-2.5 w-2.5 me-0.5" />}
                      {alert.severity}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Countdown */}
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                      getCountdownStyle(timeRemaining.hours)
                    )}>
                      {timeRemaining.hours > 0 
                        ? t('security.gateDashboard.alerts.hoursRemaining', '{{hours}}h', { hours: timeRemaining.hours })
                        : t('security.gateDashboard.alerts.minutesRemaining', '{{minutes}}m', { minutes: timeRemaining.minutes })
                      }
                    </span>

                    {/* Dismiss */}
                    {onDismiss && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDismiss(alert.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Main Content: Photo + Info */}
                <div className="flex gap-3">
                  {/* Large Photo */}
                  <Avatar className={cn('h-12 w-12 flex-shrink-0', config.avatarBorder)}>
                    <AvatarImage src={alert.photoUrl} alt={alert.personName} />
                    <AvatarFallback className="text-sm font-semibold bg-muted">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Person Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Alert Type */}
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      <span className="text-[10px] font-medium truncate">
                        {alert.title}
                      </span>
                    </div>

                    {/* Name */}
                    <p className="text-sm font-semibold truncate leading-tight">
                      {alert.personName || t('common.unknown', 'Unknown')}
                    </p>

                    {/* ID */}
                    {alert.nationalId && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <IdCard className="h-3 w-3 flex-shrink-0" />
                        <span className="text-[11px] font-mono truncate">
                          {alert.nationalId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
