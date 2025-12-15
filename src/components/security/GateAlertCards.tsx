import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldX, Clock, MapPin, X, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
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

const alertColors = {
  critical: 'border-destructive/50 bg-destructive/10',
  warning: 'border-warning/50 bg-warning/10',
  info: 'border-primary/50 bg-primary/10',
};

const badgeVariants = {
  critical: 'destructive',
  warning: 'secondary',
  info: 'outline',
} as const;

export function GateAlertCards({ alerts, onDismiss, onAcknowledge }: GateAlertCardsProps) {
  const { t } = useTranslation();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-2">
        {alerts.map((alert) => {
          const Icon = alertIcons[alert.type] || AlertTriangle;
          
          return (
            <Card
              key={alert.id}
              className={cn(
                'min-w-[280px] max-w-[320px] border-2 flex-shrink-0',
                alertColors[alert.severity]
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className={cn(
                      'p-1.5 rounded-full flex-shrink-0',
                      alert.severity === 'critical' && 'bg-destructive/20 text-destructive',
                      alert.severity === 'warning' && 'bg-warning/20 text-warning',
                      alert.severity === 'info' && 'bg-primary/20 text-primary'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={badgeVariants[alert.severity]} className="text-xs">
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm mt-1 truncate">
                        {alert.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {alert.description}
                      </p>
                      {alert.personName && (
                        <p className="text-xs font-medium mt-1 text-foreground">
                          {alert.personName}
                        </p>
                      )}
                    </div>
                  </div>
                  {onDismiss && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => onDismiss(alert.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {alert.actionRequired && onAcknowledge && (
                  <div className="mt-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs"
                      onClick={() => onAcknowledge(alert.id)}
                    >
                      {t('security.gateDashboard.alerts.acknowledge', 'Acknowledge')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
