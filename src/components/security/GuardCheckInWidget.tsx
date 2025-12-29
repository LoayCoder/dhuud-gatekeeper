import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { 
  LogIn, 
  LogOut, 
  MapPin, 
  Loader2,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useMyActiveAttendance, useCheckIn, useCheckOut } from '@/hooks/use-guard-attendance';
import { cn } from '@/lib/utils';

export function GuardCheckInWidget() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const { data: activeAttendance, isLoading } = useMyActiveAttendance();
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const isCheckedIn = !!activeAttendance;

  const getLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError(t('security.geolocationNotSupported', 'Geolocation is not supported'));
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        setLocationError(error.message);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (dialogOpen) {
      getLocation();
    }
  }, [dialogOpen]);

  const handleCheckIn = async () => {
    await checkInMutation.mutateAsync({
      latitude: location?.lat,
      longitude: location?.lng,
      accuracy: location?.accuracy,
      method: 'gps',
      notes: notes || undefined,
    });
    setDialogOpen(false);
    setNotes('');
  };

  const handleCheckOut = async () => {
    await checkOutMutation.mutateAsync({
      latitude: location?.lat,
      longitude: location?.lng,
      accuracy: location?.accuracy,
      method: 'gps',
      notes: notes || undefined,
    });
    setDialogOpen(false);
    setNotes('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.loading', 'Loading...')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(isCheckedIn && 'border-success bg-success/5')}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            {isCheckedIn ? (
              <>
                <CheckCircle className="h-5 w-5 text-success" />
                {t('security.youAreOnDuty', 'You Are On Duty')}
              </>
            ) : (
              <>
                <Clock className="h-5 w-5" />
                {t('security.readyToCheckIn', 'Ready to Check In?')}
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isCheckedIn ? (
              <>
                {t('security.checkedInAt', 'Checked in at {{time}}', {
                  time: activeAttendance?.check_in_at
                    ? format(new Date(activeAttendance.check_in_at), 'HH:mm')
                    : '-',
                })}
              </>
            ) : (
              t('security.startYourShift', 'Start your shift by checking in')
            )}
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              variant={isCheckedIn ? 'destructive' : 'default'}
              className="min-w-[120px]"
            >
              {isCheckedIn ? (
                <>
                  <LogOut className="h-4 w-4 me-2" />
                  {t('security.checkOut', 'Check Out')}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 me-2" />
                  {t('security.checkIn', 'Check In')}
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isCheckedIn
                  ? t('security.confirmCheckOut', 'Confirm Check Out')
                  : t('security.confirmCheckIn', 'Confirm Check In')}
              </DialogTitle>
              <DialogDescription>
                {isCheckedIn
                  ? t('security.checkOutDesc', 'You are about to end your shift. Make sure all tasks are complete.')
                  : t('security.checkInDesc', 'You are about to start your shift. Your location will be recorded.')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Location Status */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <MapPin className={cn('h-5 w-5', location ? 'text-success' : 'text-muted-foreground')} />
                <div className="flex-1">
                  {isGettingLocation ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{t('security.gettingLocation', 'Getting location...')}</span>
                    </div>
                  ) : location ? (
                    <div>
                      <p className="text-sm font-medium text-success">
                        {t('security.locationCaptured', 'Location Captured')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('security.accuracy', 'Accuracy: {{meters}}m', { meters: Math.round(location.accuracy) })}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-destructive">{locationError || t('security.locationUnavailable', 'Location unavailable')}</p>
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={getLocation}>
                        {t('common.retry', 'Retry')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">{t('common.notes', 'Notes')} ({t('common.optional', 'optional')})</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('security.attendanceNotesPlaceholder', 'Add any notes about your shift...')}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant={isCheckedIn ? 'destructive' : 'default'}
                onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                disabled={checkInMutation.isPending || checkOutMutation.isPending}
              >
                {(checkInMutation.isPending || checkOutMutation.isPending) && (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                )}
                {isCheckedIn
                  ? t('security.checkOut', 'Check Out')
                  : t('security.checkIn', 'Check In')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      {isCheckedIn && activeAttendance?.late_minutes && activeAttendance.late_minutes > 0 && (
        <CardContent className="pt-0">
          <Badge variant="destructive">
            {t('security.lateByMinutes', 'Late by {{minutes}} minutes', { minutes: activeAttendance.late_minutes })}
          </Badge>
        </CardContent>
      )}
    </Card>
  );
}
