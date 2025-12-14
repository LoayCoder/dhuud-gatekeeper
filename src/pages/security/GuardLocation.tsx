import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, Clock, CheckCircle, LogOut, RefreshCw, Battery, Navigation, AlertTriangle, Shield } from 'lucide-react';
import { useMyRosterAssignment, useGuardCheckIn, useGuardCheckOut } from '@/hooks/use-shift-roster';
import { useTrackMyLocation } from '@/hooks/use-live-tracking';
import { cn } from '@/lib/utils';

export default function GuardLocation() {
  const { t } = useTranslation();
  const [currentPosition, setCurrentPosition] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  const { data: assignment, isLoading, refetch } = useMyRosterAssignment();
  const checkIn = useGuardCheckIn();
  const checkOut = useGuardCheckOut();
  const trackLocation = useTrackMyLocation();

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((b: any) => { setBatteryLevel(Math.round(b.level * 100)); b.addEventListener('levelchange', () => setBatteryLevel(Math.round(b.level * 100))); });
    }
  }, []);

  const getCurrentPosition = useCallback(() => {
    setGpsError(null);
    if (!navigator.geolocation) { setGpsError('GPS not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setCurrentPosition({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => setGpsError(e.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => { getCurrentPosition(); }, [getCurrentPosition]);

  const handleCheckIn = async () => {
    if (!assignment || !currentPosition) return;
    await checkIn.mutateAsync({ id: assignment.id, lat: currentPosition.latitude, lng: currentPosition.longitude });
    await trackLocation.mutateAsync({ lat: currentPosition.latitude, lng: currentPosition.longitude, accuracy: currentPosition.accuracy, batteryLevel: batteryLevel || undefined });
    refetch();
  };

  const handleCheckOut = async () => {
    if (!assignment || !currentPosition) return;
    await checkOut.mutateAsync({ id: assignment.id, lat: currentPosition.latitude, lng: currentPosition.longitude });
    refetch();
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  if (!assignment) return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">{t('security.myLocation.title', 'My Location')}</h1></div>
      <Card><CardContent className="flex flex-col items-center py-12"><Shield className="h-16 w-16 text-muted-foreground mb-4" /><h2 className="text-xl font-semibold mb-2">{t('security.myLocation.noAssignment', 'No Assignment Today')}</h2><p className="text-muted-foreground text-center">{t('security.myLocation.noAssignmentDesc', 'Contact your supervisor.')}</p></CardContent></Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">{t('security.myLocation.title', 'My Location')}</h1><p className="text-muted-foreground">{t('security.myLocation.description', 'Track and manage check-in')}</p></div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{t('security.myLocation.todayAssignment', "Today's Assignment")}</CardTitle><CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription></div>
            <Badge className={cn(assignment.status === 'checked_in' && 'bg-green-500', assignment.status === 'completed' && 'bg-muted-foreground', assignment.status === 'scheduled' && 'bg-blue-500')}>{assignment.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>Zone: {assignment.zone_id?.slice(0, 8)}...</div>
            <div>Shift: {assignment.shift_id?.slice(0, 8)}...</div>
            {assignment.check_in_time && <div className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" />Checked in at {format(new Date(assignment.check_in_time), 'HH:mm')}</div>}
            {assignment.check_out_time && <div className="flex items-center gap-1 text-muted-foreground"><LogOut className="h-4 w-4" />Checked out at {format(new Date(assignment.check_out_time), 'HH:mm')}</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Navigation className="h-5 w-5" />{t('security.myLocation.gpsStatus', 'GPS Status')}</CardTitle></CardHeader>
        <CardContent>
          {gpsError ? <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>GPS Error</AlertTitle><AlertDescription>{gpsError}</AlertDescription></Alert> : currentPosition ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" /><span className="text-green-600 font-medium">GPS Active</span></div><Button variant="ghost" size="sm" onClick={getCurrentPosition}><RefreshCw className="h-4 w-4 me-2" />Refresh</Button></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Latitude</p><p className="font-mono">{currentPosition.latitude.toFixed(6)}</p></div>
                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Longitude</p><p className="font-mono">{currentPosition.longitude.toFixed(6)}</p></div>
                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Accuracy</p><p className="font-mono">±{currentPosition.accuracy.toFixed(0)}m</p></div>
              </div>
              {batteryLevel !== null && <div className={cn("flex items-center gap-1 text-sm", batteryLevel < 20 && "text-destructive")}><Battery className="h-4 w-4" />{batteryLevel}%</div>}
            </div>
          ) : <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /><span className="ms-2">Acquiring GPS...</span></div>}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        {assignment.status === 'scheduled' && <Button size="lg" className="flex-1" onClick={handleCheckIn} disabled={!currentPosition || checkIn.isPending}><CheckCircle className="h-5 w-5 me-2" />{checkIn.isPending ? 'Checking In...' : 'Check In'}</Button>}
        {assignment.status === 'checked_in' && <Button size="lg" variant="outline" className="flex-1" onClick={handleCheckOut} disabled={!currentPosition || checkOut.isPending}><LogOut className="h-5 w-5 me-2" />{checkOut.isPending ? 'Checking Out...' : 'Check Out'}</Button>}
        {assignment.status === 'completed' && <div className="flex-1 text-center py-4 bg-muted rounded-lg"><CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" /><p className="font-medium">Shift Completed</p></div>}
      </div>
    </div>
  );
}
