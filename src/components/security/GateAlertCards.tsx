import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldX, Clock, MapPin, X, Bell, Zap, AlertCircle, IdCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

const alertConfigs = {
  critical: {
    border: 'border-destructive/50',
    bg: 'bg-gradient-to-br from-destructive/15 via-destructive/10 to-destructive/5',
    iconBg: 'bg-destructive/20',
    iconColor: 'text-destructive',
    glow: 'shadow-[0_0_20px_-5px] shadow-destructive/30',
    pulse: true,
  },
  warning: {
    border: 'border-amber-500/50',
    bg: 'bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-amber-500/5',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    glow: 'shadow-[0_0_15px_-5px] shadow-amber-500/30',
    pulse: false,
  },
  info: {
    border: 'border-primary/50',
    bg: 'bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5',
    iconBg: 'bg-primary/20',
    iconColor: 'text-primary',
    glow: 'shadow-[0_0_10px_-5px] shadow-primary/20',
    pulse: false,
  },
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
      <div className="flex gap-4 pb-3">
        {alerts.map((alert, index) => {
          const Icon = alertIcons[alert.type] || AlertTriangle;
          const config = alertConfigs[alert.severity];
          
          return (
            <Card
              key={alert.id}
              className={cn(
                'min-w-[300px] max-w-[340px] flex-shrink-0 border-2 overflow-hidden transition-all duration-300 hover:scale-[1.02] animate-fade-in',
                config.border,
                config.bg,
                config.glow
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Animated Icon */}
                    <div className={cn(
                      'relative p-2.5 rounded-xl flex-shrink-0 transition-transform',
                      config.iconBg
                    )}>
                      {config.pulse && (
                        <div className="absolute inset-0 rounded-xl bg-destructive/30 animate-ping" />
                      )}
                      <Icon className={cn('h-5 w-5 relative z-10', config.iconColor)} />
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Severity & Time */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant={badgeVariants[alert.severity]} 
                          className={cn(
                            'text-xs font-semibold uppercase tracking-wide',
                            alert.severity === 'critical' && 'animate-pulse',
                            alert.severity === 'warning' && 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300'
                          )}
                        >
                          {alert.severity === 'critical' && <Zap className="h-3 w-3 me-1" />}
                          {alert.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {/* Title */}
                      <h4 className="font-semibold text-sm leading-tight">
                        {alert.title}
                      </h4>
                      
                      {/* Description */}
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {alert.description}
                      </p>
                      
                      {/* Person Name, Photo & ID */}
                      {(alert.personName || alert.nationalId) && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                          {alert.photoUrl ? (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={alert.photoUrl} alt={alert.personName} />
                              <AvatarFallback className="text-xs">
                                {alert.personName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                              {alert.personName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium block truncate">
                              {alert.personName}
                            </span>
                            {alert.nationalId && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <IdCard className="h-3 w-3" />
                                {alert.nationalId}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Dismiss Button */}
                  {onDismiss && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => onDismiss(alert.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                
                {/* Action Button */}
                {alert.actionRequired && onAcknowledge && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <Button
                      size="sm"
                      variant={alert.severity === 'critical' ? 'destructive' : 'outline'}
                      className={cn(
                        'w-full h-9 text-xs font-medium rounded-lg gap-2 transition-all',
                        alert.severity === 'critical' && 'animate-pulse hover:animate-none'
                      )}
                      onClick={() => onAcknowledge(alert.id)}
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      {t('security.gateDashboard.alerts.acknowledge', 'Acknowledge & Review')}
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
