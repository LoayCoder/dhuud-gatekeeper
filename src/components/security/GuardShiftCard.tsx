import { useTranslation } from 'react-i18next';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, MapPin, Shield, Timer, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShiftAssignment {
  id: string;
  zone_id: string;
  shift_id: string;
  status: string;
  check_in_time?: string;
  check_out_time?: string;
  roster_date: string;
  notes?: string;
}

interface ShiftDetails {
  shift_name?: string;
  start_time?: string;
  end_time?: string;
}

interface ZoneDetails {
  zone_name?: string;
  zone_code?: string;
}

interface GuardShiftCardProps {
  assignment: ShiftAssignment;
  shiftDetails?: ShiftDetails;
  zoneDetails?: ZoneDetails;
  nextCheckpoint?: {
    name: string;
    distance?: number;
  };
}

export function GuardShiftCard({
  assignment,
  shiftDetails,
  zoneDetails,
  nextCheckpoint,
}: GuardShiftCardProps) {
  const { t } = useTranslation();

  const getShiftProgress = () => {
    if (!shiftDetails?.start_time || !shiftDetails?.end_time || !assignment.check_in_time) {
      return 0;
    }

    const now = new Date();
    const today = format(new Date(), 'yyyy-MM-dd');
    const startTime = new Date(`${today}T${shiftDetails.start_time}`);
    const endTime = new Date(`${today}T${shiftDetails.end_time}`);
    
    // Handle overnight shifts
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    const totalMinutes = differenceInMinutes(endTime, startTime);
    const elapsedMinutes = differenceInMinutes(now, startTime);
    
    return Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));
  };

  const getTimeRemaining = () => {
    if (!shiftDetails?.end_time) return null;

    const now = new Date();
    const today = format(new Date(), 'yyyy-MM-dd');
    const endTime = new Date(`${today}T${shiftDetails.end_time}`);
    
    // Handle overnight shifts
    const startTime = shiftDetails?.start_time 
      ? new Date(`${today}T${shiftDetails.start_time}`)
      : null;
    if (startTime && endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    const hoursRemaining = differenceInHours(endTime, now);
    const minutesRemaining = differenceInMinutes(endTime, now) % 60;

    if (hoursRemaining < 0) return null;
    
    return `${hoursRemaining}h ${minutesRemaining}m`;
  };

  const getStatusColor = () => {
    switch (assignment.status) {
      case 'checked_in': return 'bg-green-500';
      case 'completed': return 'bg-muted-foreground';
      case 'scheduled': return 'bg-blue-500';
      default: return 'bg-muted-foreground';
    }
  };

  const progress = getShiftProgress();
  const timeRemaining = getTimeRemaining();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            {t('security.myLocation.shiftDetails', 'Shift Details')}
          </CardTitle>
          <Badge className={cn(getStatusColor(), 'text-white')}>
            {assignment.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zone Info */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">{zoneDetails?.zone_name || t('common.loading', 'Loading...')}</p>
            <p className="text-xs text-muted-foreground">{zoneDetails?.zone_code}</p>
          </div>
        </div>

        {/* Shift Time */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Clock className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-medium">{shiftDetails?.shift_name || t('common.loading', 'Loading...')}</p>
            <p className="text-xs text-muted-foreground">
              {shiftDetails?.start_time && shiftDetails?.end_time 
                ? `${shiftDetails.start_time} - ${shiftDetails.end_time}`
                : '--:-- - --:--'
              }
            </p>
          </div>
          {timeRemaining && assignment.status === 'checked_in' && (
            <Badge variant="outline" className="text-xs">
              <Timer className="h-3 w-3 me-1" />
              {timeRemaining}
            </Badge>
          )}
        </div>

        {/* Shift Progress */}
        {assignment.status === 'checked_in' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('security.myLocation.shiftProgress', 'Shift Progress')}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Next Checkpoint */}
        {nextCheckpoint && assignment.status === 'checked_in' && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
            <Target className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                {t('security.myLocation.nextCheckpoint', 'Next Checkpoint')}
              </p>
              <p className="font-medium">{nextCheckpoint.name}</p>
            </div>
            {nextCheckpoint.distance !== undefined && (
              <Badge variant="secondary" className="text-xs">
                {nextCheckpoint.distance < 1000 
                  ? `${nextCheckpoint.distance.toFixed(0)}m`
                  : `${(nextCheckpoint.distance / 1000).toFixed(1)}km`
                }
              </Badge>
            )}
          </div>
        )}

        {/* Check-in/out times */}
        {assignment.check_in_time && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              ✓ {t('security.myLocation.checkedInAt', 'Checked in at')}: {format(new Date(assignment.check_in_time), 'HH:mm')}
            </p>
            {assignment.check_out_time && (
              <p>
                ✓ {t('security.myLocation.checkedOutAt', 'Checked out at')}: {format(new Date(assignment.check_out_time), 'HH:mm')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
