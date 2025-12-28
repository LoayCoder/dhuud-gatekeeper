import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  AlertOctagon,
  Shield,
  Heart,
  Flame,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEmergencyAlerts,
  useAcknowledgeEmergencyAlert,
  useResolveEmergencyAlert,
  useRealtimeEmergencyAlerts,
  EmergencyAlert,
} from '@/hooks/use-emergency-alerts';
import { cn } from '@/lib/utils';

interface EmergencyAlertsListProps {
  statusFilter?: 'active' | 'acknowledged' | 'resolved' | 'all';
  limit?: number;
  showHeader?: boolean;
}

export function EmergencyAlertsList({
  statusFilter = 'all',
  limit,
  showHeader = true,
}: EmergencyAlertsListProps) {
  const { t } = useTranslation();
  const { data: alerts, isLoading } = useEmergencyAlerts(statusFilter);
  useRealtimeEmergencyAlerts();

  const displayedAlerts = limit ? alerts?.slice(0, limit) : alerts;

  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('security.emergencyAlerts', 'Emergency Alerts')}
          </CardTitle>
          <CardDescription>
            {t('security.emergencyAlertsDesc', 'Active and recent emergency alerts')}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {!displayedAlerts?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t('security.noEmergencyAlerts', 'No emergency alerts')}</p>
          </div>
        ) : (
          displayedAlerts.map((alert) => (
            <EmergencyAlertCard key={alert.id} alert={alert} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EmergencyAlertCard({ alert }: { alert: EmergencyAlert }) {
  const { t } = useTranslation();
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isFalseAlarm, setIsFalseAlarm] = useState(false);

  const acknowledge = useAcknowledgeEmergencyAlert();
  const resolve = useResolveEmergencyAlert();

  const isActive = !alert.acknowledged_at && !alert.resolved_at;
  const isAcknowledged = alert.acknowledged_at && !alert.resolved_at;
  const isResolved = !!alert.resolved_at;

  const getAlertIcon = () => {
    switch (alert.alert_type) {
      case 'panic': return <AlertOctagon className="h-5 w-5" />;
      case 'security_breach': return <Shield className="h-5 w-5" />;
      case 'medical': return <Heart className="h-5 w-5" />;
      case 'fire': return <Flame className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertColor = () => {
    if (isResolved) return 'bg-muted';
    switch (alert.alert_type) {
      case 'panic': return 'bg-destructive/10 border-destructive';
      case 'security_breach': return 'bg-orange-500/10 border-orange-500';
      case 'medical': return 'bg-blue-500/10 border-blue-500';
      case 'fire': return 'bg-amber-500/10 border-amber-500';
      default: return 'bg-destructive/10 border-destructive';
    }
  };

  const handleResolve = async () => {
    await resolve.mutateAsync({
      alertId: alert.id,
      notes: resolutionNotes,
      isFalseAlarm,
    });
    setResolveDialogOpen(false);
    setResolutionNotes('');
    setIsFalseAlarm(false);
  };

  return (
    <>
      <div
        className={cn(
          'p-4 rounded-lg border-2 transition-all',
          getAlertColor(),
          isActive && 'animate-pulse'
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'p-2 rounded-full',
              isResolved ? 'bg-muted-foreground/20 text-muted-foreground' : 'bg-destructive/20 text-destructive'
            )}>
              {getAlertIcon()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold capitalize">
                  {alert.alert_type.replace('_', ' ')}
                </span>
                <Badge
                  variant={
                    isActive ? 'destructive' :
                    isAcknowledged ? 'secondary' :
                    'outline'
                  }
                >
                  {isActive ? t('security.active', 'Active') :
                   isAcknowledged ? t('security.acknowledged', 'Acknowledged') :
                   t('security.resolved', 'Resolved')}
                </Badge>
                {alert.is_false_alarm && (
                  <Badge variant="outline">{t('security.falseAlarm', 'False Alarm')}</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(alert.triggered_at), 'MMM d, HH:mm')}
                </span>
                {alert.guard?.full_name && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {alert.guard.full_name}
                  </span>
                )}
                {alert.latitude && alert.longitude && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                  </span>
                )}
              </div>

              {alert.notes && (
                <p className="text-sm text-muted-foreground mt-2">{alert.notes}</p>
              )}

              {alert.response_time_seconds && (
                <p className="text-xs text-muted-foreground">
                  {t('security.responseTime', 'Response time')}: {Math.round(alert.response_time_seconds / 60)}m {alert.response_time_seconds % 60}s
                </p>
              )}

              {alert.resolution_notes && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  {t('security.resolution', 'Resolution')}: {alert.resolution_notes}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isActive && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => acknowledge.mutate(alert.id)}
                disabled={acknowledge.isPending}
              >
                {acknowledge.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('security.acknowledge', 'Acknowledge')
                )}
              </Button>
            )}
            {isAcknowledged && (
              <Button
                size="sm"
                onClick={() => setResolveDialogOpen(true)}
              >
                {t('security.resolve', 'Resolve')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('security.resolveAlert', 'Resolve Alert')}</DialogTitle>
            <DialogDescription>
              {t('security.resolveAlertDesc', 'Provide details about how this alert was resolved.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('security.resolutionNotes', 'Resolution Notes')}</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder={t('security.resolutionNotesPlaceholder', 'Describe how the situation was resolved...')}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="falseAlarm"
                checked={isFalseAlarm}
                onCheckedChange={(checked) => setIsFalseAlarm(checked as boolean)}
              />
              <Label htmlFor="falseAlarm" className="text-sm">
                {t('security.markAsFalseAlarm', 'Mark as false alarm')}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleResolve} disabled={resolve.isPending || !resolutionNotes.trim()}>
              {resolve.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <CheckCircle className="h-4 w-4 me-2" />
              )}
              {t('security.resolveAlert', 'Resolve Alert')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
