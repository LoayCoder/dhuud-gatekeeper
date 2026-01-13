import { useTranslation } from 'react-i18next';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, RefreshCw, Sun, Moon, Sunrise, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAcknowledgmentStatus, type UpcomingShift } from '@/hooks/use-shift-roster';

interface ShiftScheduleCardProps {
  shift: UpcomingShift;
  onAcknowledge: (id: string) => void;
  isPending: boolean;
  isToday?: boolean;
}

function getShiftIcon(startTime: string | null | undefined) {
  if (!startTime) return <Clock className="h-4 w-4" />;
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour >= 6 && hour < 12) return <Sunrise className="h-4 w-4 text-amber-500" />;
  if (hour >= 12 && hour < 18) return <Sun className="h-4 w-4 text-yellow-500" />;
  return <Moon className="h-4 w-4 text-indigo-500" />;
}

function formatTimeRemaining(assignedAt: string | null): string {
  if (!assignedAt) return '';
  const now = new Date();
  const assigned = new Date(assignedAt);
  const autoAckTime = new Date(assigned.getTime() + 12 * 60 * 60 * 1000);
  
  const minutesRemaining = differenceInMinutes(autoAckTime, now);
  if (minutesRemaining <= 0) return 'Auto-acknowledging...';
  
  const hours = Math.floor(minutesRemaining / 60);
  const minutes = minutesRemaining % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function ShiftScheduleCard({ shift, onAcknowledge, isPending, isToday }: ShiftScheduleCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const locale = isRTL ? ar : enUS;

  const status = getAcknowledgmentStatus(shift);
  const timeRemaining = formatTimeRemaining(shift.assigned_at);

  const getStatusBadge = () => {
    switch (status) {
      case 'acknowledged':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
            <Check className="h-3 w-3 me-1" />
            {t('security.roster.acknowledged', 'Acknowledged')}
          </Badge>
        );
      case 'auto_acknowledged':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            <RefreshCw className="h-3 w-3 me-1" />
            {t('security.roster.autoAcknowledged', 'Auto-acknowledged')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Clock className="h-3 w-3 me-1" />
            {t('security.roster.pending', 'Pending')} • {timeRemaining}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={cn(
      "transition-all",
      isToday && "border-primary shadow-md",
      status === 'pending' && "border-amber-500/50"
    )}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Shift Info */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0",
              isToday ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              {getShiftIcon(shift.shift?.start_time)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">
                  {shift.shift?.shift_name || t('security.roster.unknownShift', 'Unknown Shift')}
                </span>
                {isToday && (
                  <Badge variant="secondary" className="text-xs">
                    {t('common.today', 'Today')}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {shift.shift?.start_time || '--:--'} - {shift.shift?.end_time || '--:--'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {shift.zone?.zone_name || t('security.roster.unknownZone', 'Unknown Zone')}
                </span>
                {shift.supervisor?.full_name && (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {shift.supervisor.full_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status & Action */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {getStatusBadge()}
            {status === 'pending' && (
              <Button
                size="sm"
                onClick={() => onAcknowledge(shift.id)}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                <Check className="h-4 w-4 me-1" />
                {t('security.roster.acknowledge', 'Acknowledge')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
