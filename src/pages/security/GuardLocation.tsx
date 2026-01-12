import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, Clock, CheckCircle, LogOut, RefreshCw, Navigation, AlertTriangle, Shield, Volume2 } from 'lucide-react';
import { useMyRosterAssignment, useGuardCheckIn, useGuardCheckOut } from '@/hooks/use-shift-roster';
import { useTrackMyLocation, useAlertSupervisorGpsOff } from '@/hooks/use-live-tracking';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GuardShiftCard } from '@/components/security/GuardShiftCard';
import { GuardStatusIndicators, BatteryWarning } from '@/components/security/GuardStatusIndicators';
import { GuardZoneMap } from '@/components/security/GuardZoneMap';
import { useTrackingIntervalMs } from '@/hooks/use-tracking-settings';
import { checkBoundaryProximity, type BoundaryProximityLevel } from '@/lib/zone-detection';
import { cn } from '@/lib/utils';

export default function GuardLocation() {
  const { t } = useTranslation();
  const [currentPosition, setCurrentPosition] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [boundaryStatus, setBoundaryStatus] = useState<BoundaryProximityLevel>('safe');
  const [distanceToEdge, setDistanceToEdge] = useState<number | undefined>(undefined);
  const [zoneCompliance, setZoneCompliance] = useState<{
    isCompliant: boolean;
    zoneName?: string;
    checkedAt?: Date;
  } | null>(null);
  const lastWarningRef = useRef<BoundaryProximityLevel>('safe');

  const { data: assignment, isLoading, refetch } = useMyRosterAssignment();
  const checkIn = useGuardCheckIn();
  const checkOut = useGuardCheckOut();
  const trackLocation = useTrackMyLocation();
  const alertSupervisorGpsOff = useAlertSupervisorGpsOff();
  const trackingIntervalMs = useTrackingIntervalMs();

  // Fetch zone details with polygon
  const { data: zoneDetails } = useQuery({
    queryKey: ['zone-details-full', assignment?.zone_id],
    queryFn: async () => {
      if (!assignment?.zone_id) return null;
      const { data, error } = await supabase
        .from('security_zones')
        .select('zone_name, zone_code, polygon_coords')
        .eq('id', assignment.zone_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!assignment?.zone_id,
  });

  // Fetch shift details
  const { data: shiftDetails } = useQuery({
    queryKey: ['shift-details', assignment?.shift_id],
    queryFn: async () => {
      if (!assignment?.shift_id) return null;
      const { data, error } = await supabase
        .from('security_shifts')
        .select('shift_name, start_time, end_time')
        .eq('id', assignment.shift_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!assignment?.shift_id,
  });

  // Battery monitoring
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((b: any) => {
        setBatteryLevel(Math.round(b.level * 100));
        b.addEventListener('levelchange', () => setBatteryLevel(Math.round(b.level * 100)));
      });
    }
  }, []);

  // Play warning sound for boundary alerts
  const playWarningSound = useCallback((level: BoundaryProximityLevel) => {
    if (level === 'danger' || level === 'outside') {
      try {
        const audio = new Audio('/sounds/warning.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      } catch {}
    }
  }, []);

  const getCurrentPosition = useCallback(() => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError(t('security.myLocation.gpsNotSupported', 'GPS not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setCurrentPosition({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy
      }),
      (e) => {
        setGpsError(e.message);
        // Alert supervisor if GPS disabled during active shift
        if (assignment?.status === 'checked_in' && (e.code === 1 || e.code === 2)) {
          alertSupervisorGpsOff.mutate({
            zoneName: zoneDetails?.zone_name,
            reason: e.code === 1 ? 'Permission denied' : 'Position unavailable',
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [t, assignment?.status, zoneDetails?.zone_name, alertSupervisorGpsOff]);

  useEffect(() => { getCurrentPosition(); }, [getCurrentPosition]);

  // Update boundary status when position or zone changes
  useEffect(() => {
    if (currentPosition && zoneDetails?.polygon_coords) {
      const polygon = zoneDetails.polygon_coords as [number, number][];
      if (polygon.length >= 3) {
        const result = checkBoundaryProximity(currentPosition.latitude, currentPosition.longitude, polygon);
        setBoundaryStatus(result.level);
        setDistanceToEdge(Math.abs(result.distanceToEdge));
        
        // Play warning sound if status changed to danger/outside
        if (result.level !== lastWarningRef.current && (result.level === 'danger' || result.level === 'outside')) {
          playWarningSound(result.level);
        }
        lastWarningRef.current = result.level;
      }
    }
  }, [currentPosition, zoneDetails?.polygon_coords, playWarningSound]);

  // Continuous tracking when checked in
  useEffect(() => {
    if (assignment?.status !== 'checked_in' || !isTracking) return;

    const interval = setInterval(async () => {
      if (currentPosition) {
        try {
          const result = await trackLocation.mutateAsync({
            lat: currentPosition.latitude,
            lng: currentPosition.longitude,
            accuracy: currentPosition.accuracy,
            batteryLevel: batteryLevel || undefined,
          });
          if (result) {
            setZoneCompliance({
              isCompliant: result.is_compliant !== false,
              zoneName: result.zone_violation?.zone_name,
              checkedAt: new Date(),
            });
            if (result.boundary_warning_level) {
              setBoundaryStatus(result.boundary_warning_level);
            }
            if (result.boundary_distance_meters !== null) {
              setDistanceToEdge(result.boundary_distance_meters);
            }
          }
        } catch (e) {
          console.error('Tracking error:', e);
        }
      }
      getCurrentPosition();
    }, trackingIntervalMs);

    return () => clearInterval(interval);
  }, [assignment?.status, isTracking, currentPosition, batteryLevel, trackLocation, getCurrentPosition, trackingIntervalMs]);

  const handleRefresh = useCallback(async () => {
    getCurrentPosition();
    await refetch();
    if (assignment?.status === 'checked_in' && currentPosition) {
      try {
        const result = await trackLocation.mutateAsync({
          lat: currentPosition.latitude,
          lng: currentPosition.longitude,
          accuracy: currentPosition.accuracy,
          batteryLevel: batteryLevel || undefined,
        });
        if (result) {
          setZoneCompliance({
            isCompliant: result.is_compliant !== false,
            zoneName: result.zone_violation?.zone_name,
            checkedAt: new Date(),
          });
        }
      } catch (e) {
        console.error('Refresh tracking error:', e);
      }
    }
  }, [getCurrentPosition, refetch, assignment?.status, currentPosition, trackLocation, batteryLevel]);

  const handleCheckIn = async () => {
    if (!assignment || !currentPosition) return;
    await checkIn.mutateAsync({ id: assignment.id, lat: currentPosition.latitude, lng: currentPosition.longitude });
    await trackLocation.mutateAsync({
      lat: currentPosition.latitude, lng: currentPosition.longitude,
      accuracy: currentPosition.accuracy, batteryLevel: batteryLevel || undefined
    });
    setIsTracking(true);
    refetch();
  };

  const handleCheckOut = async () => {
    if (!assignment || !currentPosition) return;
    await checkOut.mutateAsync({ id: assignment.id, lat: currentPosition.latitude, lng: currentPosition.longitude });
    setIsTracking(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">{t('security.myLocation.title', 'My Location')}</h1></div>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Shield className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('security.myLocation.noAssignment', 'No Assignment Today')}</h2>
            <p className="text-muted-foreground text-center">{t('security.myLocation.noAssignmentDesc', 'Contact your supervisor for shift assignment.')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const zonePolygon = zoneDetails?.polygon_coords as [number, number][] | null;

  return (
    <div className="space-y-4">
      {/* Header with Status */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{t('security.myLocation.title', 'My Location')}</h1>
            <p className="text-muted-foreground text-sm">{t('security.myLocation.description', 'Track your location and manage shift check-in')}</p>
          </div>
          <GuardStatusIndicators
            batteryLevel={batteryLevel}
            gpsAccuracy={currentPosition?.accuracy || null}
            isOnline={!gpsError && !!currentPosition}
            lastUpdate={currentPosition ? new Date() : undefined}
          />
        </div>

        {/* ACTION BUTTONS - PROMINENT AT TOP */}
        <div className="flex flex-col gap-2 sm:flex-row sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 -mx-4 px-4 border-b">
          {assignment.status === 'scheduled' && (
            <Button size="lg" className="flex-1 h-14 text-lg" onClick={handleCheckIn} disabled={!currentPosition || checkIn.isPending}>
              <CheckCircle className="h-6 w-6 me-2" />
              {checkIn.isPending ? t('security.myLocation.checkingIn', 'Checking In...') : t('security.myLocation.checkIn', 'Check In')}
            </Button>
          )}
          {assignment.status === 'checked_in' && (
            <Button size="lg" variant="outline" className="flex-1 h-14 text-lg border-2" onClick={handleCheckOut} disabled={!currentPosition || checkOut.isPending}>
              <LogOut className="h-6 w-6 me-2" />
              {checkOut.isPending ? t('security.myLocation.checkingOut', 'Checking Out...') : t('security.myLocation.checkOut', 'Check Out')}
            </Button>
          )}
          {assignment.status === 'completed' && (
            <div className="flex-1 text-center py-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-1" />
              <p className="font-medium text-green-600">{t('security.myLocation.shiftCompleted', 'Shift Completed')}</p>
            </div>
          )}
          <Button variant="ghost" size="lg" onClick={handleRefresh} disabled={trackLocation.isPending} className="h-14">
            <RefreshCw className={cn("h-5 w-5", trackLocation.isPending && "animate-spin")} />
          </Button>
        </div>
      </div>

      <BatteryWarning level={batteryLevel} />

      {/* Boundary Warning Alert */}
      {assignment.status === 'checked_in' && (boundaryStatus === 'warning' || boundaryStatus === 'danger') && (
        <Alert variant={boundaryStatus === 'danger' ? 'destructive' : 'default'} className={cn(boundaryStatus === 'danger' && 'animate-pulse')}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            {boundaryStatus === 'danger'
              ? t('security.zone.dangerTitle', 'Zone Boundary Alert!')
              : t('security.zone.warningTitle', 'Approaching Zone Boundary')}
            <Volume2 className="h-4 w-4" />
          </AlertTitle>
          <AlertDescription>
            {boundaryStatus === 'danger'
              ? t('security.zone.dangerDesc', `You are only ${distanceToEdge?.toFixed(0) || '<20'}m from the zone edge. Stay inside!`)
              : t('security.zone.warningDesc', `You are ${distanceToEdge?.toFixed(0) || '<50'}m from the zone edge.`)}
          </AlertDescription>
        </Alert>
      )}

      {/* Zone Map */}
      {assignment.status === 'checked_in' && (
        <GuardZoneMap
          zonePolygon={zonePolygon}
          guardPosition={currentPosition ? { lat: currentPosition.latitude, lng: currentPosition.longitude } : null}
          boundaryStatus={boundaryStatus}
          distanceToEdge={distanceToEdge}
          zoneName={zoneDetails?.zone_name || t('security.zone.assigned', 'Assigned Zone')}
        />
      )}

      {/* Shift Card */}
      <GuardShiftCard
        assignment={{
          id: assignment.id, zone_id: assignment.zone_id || '', shift_id: assignment.shift_id || '',
          status: assignment.status || 'scheduled', check_in_time: assignment.check_in_time || undefined,
          check_out_time: assignment.check_out_time || undefined, roster_date: assignment.roster_date,
          notes: assignment.notes || undefined,
        }}
        shiftDetails={shiftDetails ? { shift_name: shiftDetails.shift_name || undefined, start_time: shiftDetails.start_time || undefined, end_time: shiftDetails.end_time || undefined } : undefined}
        zoneDetails={zoneDetails ? { zone_name: zoneDetails.zone_name || undefined, zone_code: zoneDetails.zone_code || undefined } : undefined}
      />

      {/* GPS Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Navigation className="h-5 w-5" />
            {t('security.myLocation.gpsStatus', 'GPS Status')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gpsError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('security.myLocation.gpsError', 'GPS Error')}</AlertTitle>
              <AlertDescription>{gpsError}</AlertDescription>
            </Alert>
          ) : currentPosition ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">{t('security.myLocation.latitude', 'Latitude')}</p>
                <p className="font-mono text-sm">{currentPosition.latitude.toFixed(6)}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">{t('security.myLocation.longitude', 'Longitude')}</p>
                <p className="font-mono text-sm">{currentPosition.longitude.toFixed(6)}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">{t('security.myLocation.accuracy', 'Accuracy')}</p>
                <p className="font-mono text-sm">±{currentPosition.accuracy.toFixed(0)}m</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              <span className="ms-2 text-sm">{t('security.myLocation.acquiringGps', 'Acquiring GPS...')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}