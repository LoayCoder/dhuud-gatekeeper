import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, Clock, CheckCircle, LogOut, RefreshCw, Navigation, AlertTriangle, Shield } from 'lucide-react';
import { useMyRosterAssignment, useGuardCheckIn, useGuardCheckOut } from '@/hooks/use-shift-roster';
import { useTrackMyLocation } from '@/hooks/use-live-tracking';
import { useSecurityZones } from '@/hooks/use-security-zones';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GuardShiftCard } from '@/components/security/GuardShiftCard';
import { GuardStatusIndicators, BatteryWarning } from '@/components/security/GuardStatusIndicators';
import { cn } from '@/lib/utils';

export default function GuardLocation() {
  const { t } = useTranslation();
  const [currentPosition, setCurrentPosition] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const { data: assignment, isLoading, refetch } = useMyRosterAssignment();
  const checkIn = useGuardCheckIn();
  const checkOut = useGuardCheckOut();
  const trackLocation = useTrackMyLocation();

  // Fetch zone details
  const { data: zoneDetails } = useQuery({
    queryKey: ['zone-details', assignment?.zone_id],
    queryFn: async () => {
      if (!assignment?.zone_id) return null;
      const { data, error } = await supabase
        .from('security_zones')
        .select('zone_name, zone_code')
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
      (e) => setGpsError(e.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [t]);

  useEffect(() => { getCurrentPosition(); }, [getCurrentPosition]);

  // Continuous tracking when checked in
  useEffect(() => {
    if (assignment?.status !== 'checked_in' || !isTracking) return;

    const interval = setInterval(async () => {
      if (currentPosition) {
        await trackLocation.mutateAsync({
          lat: currentPosition.latitude,
          lng: currentPosition.longitude,
          accuracy: currentPosition.accuracy,
          batteryLevel: batteryLevel || undefined,
        });
      }
      getCurrentPosition();
    }, 30000); // Track every 30 seconds

    return () => clearInterval(interval);
  }, [assignment?.status, isTracking, currentPosition, batteryLevel, trackLocation, getCurrentPosition]);

  const handleCheckIn = async () => {
    if (!assignment || !currentPosition) return;
    await checkIn.mutateAsync({
      id: assignment.id,
      lat: currentPosition.latitude,
      lng: currentPosition.longitude
    });
    await trackLocation.mutateAsync({
      lat: currentPosition.latitude,
      lng: currentPosition.longitude,
      accuracy: currentPosition.accuracy,
      batteryLevel: batteryLevel || undefined
    });
    setIsTracking(true);
    refetch();
  };

  const handleCheckOut = async () => {
    if (!assignment || !currentPosition) return;
    await checkOut.mutateAsync({
      id: assignment.id,
      lat: currentPosition.latitude,
      lng: currentPosition.longitude
    });
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
        <div>
          <h1 className="text-2xl font-bold">{t('security.myLocation.title', 'My Location')}</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Shield className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {t('security.myLocation.noAssignment', 'No Assignment Today')}
            </h2>
            <p className="text-muted-foreground text-center">
              {t('security.myLocation.noAssignmentDesc', 'Contact your supervisor for shift assignment.')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('security.myLocation.title', 'My Location')}</h1>
          <p className="text-muted-foreground">
            {t('security.myLocation.description', 'Track your location and manage shift check-in')}
          </p>
        </div>
        <GuardStatusIndicators
          batteryLevel={batteryLevel}
          gpsAccuracy={currentPosition?.accuracy || null}
          isOnline={!gpsError && !!currentPosition}
          lastUpdate={currentPosition ? new Date() : undefined}
        />
      </div>

      {/* Battery Warning */}
      <BatteryWarning level={batteryLevel} />

      {/* Shift Card */}
      <GuardShiftCard
        assignment={{
          id: assignment.id,
          zone_id: assignment.zone_id || '',
          shift_id: assignment.shift_id || '',
          status: assignment.status || 'scheduled',
          check_in_time: assignment.check_in_time || undefined,
          check_out_time: assignment.check_out_time || undefined,
          roster_date: assignment.roster_date,
          notes: assignment.notes || undefined,
        }}
        shiftDetails={shiftDetails ? {
          shift_name: shiftDetails.shift_name || undefined,
          start_time: shiftDetails.start_time || undefined,
          end_time: shiftDetails.end_time || undefined,
        } : undefined}
        zoneDetails={zoneDetails ? {
          zone_name: zoneDetails.zone_name || undefined,
          zone_code: zoneDetails.zone_code || undefined,
        } : undefined}
      />

      {/* GPS Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-600 font-medium">
                    {t('security.myLocation.gpsActive', 'GPS Active')}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={getCurrentPosition}>
                  <RefreshCw className="h-4 w-4 me-2" />
                  {t('common.refresh', 'Refresh')}
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{t('security.myLocation.latitude', 'Latitude')}</p>
                  <p className="font-mono">{currentPosition.latitude.toFixed(6)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{t('security.myLocation.longitude', 'Longitude')}</p>
                  <p className="font-mono">{currentPosition.longitude.toFixed(6)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{t('security.myLocation.accuracy', 'Accuracy')}</p>
                  <p className="font-mono">±{currentPosition.accuracy.toFixed(0)}m</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ms-2">{t('security.myLocation.acquiringGps', 'Acquiring GPS...')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {assignment.status === 'scheduled' && (
          <Button
            size="lg"
            className="flex-1"
            onClick={handleCheckIn}
            disabled={!currentPosition || checkIn.isPending}
          >
            <CheckCircle className="h-5 w-5 me-2" />
            {checkIn.isPending
              ? t('security.myLocation.checkingIn', 'Checking In...')
              : t('security.myLocation.checkIn', 'Check In')}
          </Button>
        )}
        {assignment.status === 'checked_in' && (
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={handleCheckOut}
            disabled={!currentPosition || checkOut.isPending}
          >
            <LogOut className="h-5 w-5 me-2" />
            {checkOut.isPending
              ? t('security.myLocation.checkingOut', 'Checking Out...')
              : t('security.myLocation.checkOut', 'Check Out')}
          </Button>
        )}
        {assignment.status === 'completed' && (
          <div className="flex-1 text-center py-4 bg-muted rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="font-medium">{t('security.myLocation.shiftCompleted', 'Shift Completed')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
