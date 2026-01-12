import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Eye, CheckCircle, MapPin, Clock, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  alert_type: string;
  severity?: string;
  guard_name?: string;
  guard_id?: string;
  created_at: string;
  alert_message?: string;
  latitude?: number;
  longitude?: number;
}

interface TacticalAlertPanelProps {
  pendingAlerts: Alert[];
  acknowledgedAlerts: Alert[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  isAcknowledging?: boolean;
  className?: string;
}

function getSeverityClass(severity?: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'bg-[hsl(var(--tactical-critical)/0.2)] border-[hsl(var(--tactical-critical)/0.5)] tactical-text-critical';
    case 'high':
      return 'bg-[hsl(27_96%_61%/0.2)] border-[hsl(27_96%_61%/0.5)] text-[hsl(27_96%_61%)]';
    case 'medium':
      return 'bg-[hsl(var(--tactical-warning)/0.2)] border-[hsl(var(--tactical-warning)/0.5)] tactical-text-warning';
    default:
      return 'bg-[hsl(var(--tactical-info)/0.2)] border-[hsl(var(--tactical-info)/0.5)] text-[hsl(var(--tactical-info))]';
  }
}

function AlertCard({
  alert,
  isPending,
  onAcknowledge,
  onResolve,
  isAcknowledging,
}: {
  alert: Alert;
  isPending: boolean;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  isAcknowledging?: boolean;
}) {
  const { t } = useTranslation();
  
  const timeAgo = formatDistanceToNow(new Date(alert.created_at), { addSuffix: false });

  return (
    <div className={cn(
      'tactical-card p-3 space-y-2',
      isPending && 'tactical-glow-critical border-[hsl(var(--tactical-critical)/0.5)]',
      !isPending && 'border-[hsl(var(--tactical-warning)/0.4)]'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Severity Badge */}
          <span className={cn(
            'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
            getSeverityClass(alert.severity)
          )}>
            {alert.severity || 'INFO'}
          </span>
          
          {/* Pulsing indicator for pending */}
          {isPending && (
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--tactical-critical))] animate-threat-pulse" />
          )}
        </div>
        
        {/* Time */}
        <div className="flex items-center gap-1 text-[10px] tactical-text-dim tactical-mono">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </div>
      </div>

      {/* Alert Type */}
      <div className={cn(
        'text-sm font-medium',
        isPending ? 'tactical-text-critical' : 'tactical-text-warning'
      )}>
        {alert.alert_type}
      </div>

      {/* Guard Info */}
      <div className="flex items-center gap-2 text-xs tactical-text-dim">
        <User className="h-3 w-3" />
        <span>{alert.guard_name || `Guard ${alert.guard_id?.slice(0, 8)}`}</span>
      </div>

      {/* Location if available */}
      {alert.latitude && alert.longitude && (
        <div className="flex items-center gap-2 text-xs tactical-text-dim tactical-mono">
          <MapPin className="h-3 w-3" />
          <span>{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
        </div>
      )}

      {/* Message */}
      {alert.alert_message && (
        <p className="text-xs tactical-text-dim line-clamp-2 border-t border-[hsl(var(--tactical-border))] pt-2 mt-2">
          {alert.alert_message}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {isPending ? (
          <button
            onClick={() => onAcknowledge(alert.id)}
            disabled={isAcknowledging}
            className="tactical-btn flex-1 flex items-center justify-center gap-1.5 py-1.5"
          >
            <Eye className="h-3 w-3" />
            <span>{t('security.tactical.acknowledge', 'Acknowledge')}</span>
          </button>
        ) : (
          <button
            onClick={() => onResolve(alert.id)}
            className="tactical-btn tactical-btn-primary flex-1 flex items-center justify-center gap-1.5 py-1.5"
          >
            <CheckCircle className="h-3 w-3" />
            <span>{t('security.tactical.resolve', 'Resolve')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function TacticalAlertPanel({
  pendingAlerts,
  acknowledgedAlerts,
  onAcknowledge,
  onResolve,
  isAcknowledging,
  className,
}: TacticalAlertPanelProps) {
  const { t } = useTranslation();
  const totalAlerts = pendingAlerts.length + acknowledgedAlerts.length;

  return (
    <div className={cn('tactical-card h-full flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b border-[hsl(var(--tactical-border))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className={cn(
              'h-5 w-5',
              pendingAlerts.length > 0 ? 'tactical-text-critical animate-tactical-pulse' : 'tactical-text-dim'
            )} />
            <span className="text-sm font-medium uppercase tracking-wider tactical-text">
              {t('security.tactical.alerts', 'Alerts')}
            </span>
          </div>
          
          {/* Alert Count */}
          <div className={cn(
            'px-2.5 py-1 rounded text-xs font-bold tactical-mono',
            pendingAlerts.length > 0 
              ? 'bg-[hsl(var(--tactical-critical)/0.2)] tactical-text-critical' 
              : 'bg-[hsl(var(--tactical-accent)/0.2)] tactical-text-accent'
          )}>
            {pendingAlerts.length} / {totalAlerts}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {totalAlerts === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 tactical-text-accent mb-4" />
              <span className="tactical-text text-sm">
                {t('security.tactical.noAlerts', 'All Clear')}
              </span>
              <span className="tactical-text-dim text-xs mt-1">
                {t('security.tactical.noAlertsDesc', 'No active alerts at this time')}
              </span>
            </div>
          ) : (
            <>
              {/* Pending Alerts */}
              {pendingAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  isPending={true}
                  onAcknowledge={onAcknowledge}
                  onResolve={onResolve}
                  isAcknowledging={isAcknowledging}
                />
              ))}

              {/* Acknowledged Alerts */}
              {acknowledgedAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  isPending={false}
                  onAcknowledge={onAcknowledge}
                  onResolve={onResolve}
                />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
