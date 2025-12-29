import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Route, 
  MapPin, 
  Clock, 
  Battery, 
  Wifi, 
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Play,
  FileText,
  Bell
} from 'lucide-react';
import { EmergencyPanicButton } from '@/components/security/EmergencyPanicButton';
import { GuardQuickActions } from '@/components/security/GuardQuickActions';
import { QuickIncidentReport } from '@/components/security/QuickIncidentReport';
import { OfflinePatrolIndicator } from '@/components/security/OfflinePatrolIndicator';
import { useOfflinePatrolQueue } from '@/hooks/use-offline-patrol-queue';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function GuardMobileDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOnline, pendingCount } = useOfflinePatrolQueue();
  const [showIncidentReport, setShowIncidentReport] = useState(false);
  const [currentShift, setCurrentShift] = useState<{
    zone_name: string;
    shift_name: string;
    start_time: string;
    end_time: string;
  } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [pendingAlerts, setPendingAlerts] = useState(0);

  // Fetch current shift
  useEffect(() => {
    const fetchCurrentShift = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('shift_roster')
        .select(`
          security_zones(zone_name),
          security_shifts(name, start_time, end_time)
        `)
        .eq('guard_id', user.id)
        .eq('roster_date', today)
        .is('deleted_at', null)
        .maybeSingle();

      if (data) {
        setCurrentShift({
          zone_name: (data.security_zones as any)?.zone_name || 'Unknown',
          shift_name: (data.security_shifts as any)?.name || 'Unknown',
          start_time: (data.security_shifts as any)?.start_time || '',
          end_time: (data.security_shifts as any)?.end_time || '',
        });
      }
    };

    fetchCurrentShift();
  }, []);

  // Get battery level
  useEffect(() => {
    const getBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setBattery(Math.round(battery.level * 100));
          battery.addEventListener('levelchange', () => {
            setBattery(Math.round(battery.level * 100));
          });
        } catch (e) {
          console.error('Battery API not available');
        }
      }
    };
    getBattery();
  }, []);

  // Get current location
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Fetch pending alerts count
  useEffect(() => {
    const fetchAlerts = async () => {
      const { count } = await supabase
        .from('geofence_alerts')
        .select('*', { count: 'exact', head: true })
        .is('acknowledged_at', null)
        .is('resolved_at', null)
        .is('deleted_at', null);
      
      setPendingAlerts(count ?? 0);
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  if (showIncidentReport) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <QuickIncidentReport 
          onSuccess={() => setShowIncidentReport(false)}
          onCancel={() => setShowIncidentReport(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Status Bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">{t('security.guard.mobileApp', 'Guard Mode')}</span>
          </div>
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )}
            {battery !== null && (
              <div className="flex items-center gap-1">
                <Battery className={cn(
                  'h-4 w-4',
                  battery < 20 ? 'text-destructive' : battery < 50 ? 'text-yellow-500' : 'text-green-500'
                )} />
                <span className="text-xs">{battery}%</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {format(new Date(), 'HH:mm')}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Offline Indicator */}
        {!isOnline && (
          <OfflinePatrolIndicator />
        )}

        {/* Current Shift Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('security.guard.currentShift', 'Current Shift')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentShift ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('security.guard.zone', 'Zone')}</span>
                  <Badge variant="outline">{currentShift.zone_name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('security.guard.shift', 'Shift')}</span>
                  <span className="font-medium">{currentShift.shift_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('security.guard.time', 'Time')}</span>
                  <span className="text-sm">{currentShift.start_time} - {currentShift.end_time}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('security.guard.noShift', 'No shift assigned today')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Location Status */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className={cn(
                  'h-5 w-5',
                  location ? 'text-green-500' : 'text-muted-foreground'
                )} />
                <span className="text-sm">
                  {location 
                    ? t('security.guard.locationActive', 'Location Active') 
                    : t('security.guard.locationInactive', 'Location Unavailable')
                  }
                </span>
              </div>
              {location && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts Badge */}
        {pendingAlerts > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium">
                    {t('security.guard.pendingAlerts', '{{count}} Pending Alerts', { count: pendingAlerts })}
                  </span>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => navigate('/security/command-center')}
                >
                  {t('common.view', 'View')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Grid */}
        <div className="pt-2">
          <h3 className="text-sm font-medium mb-3">{t('security.guard.quickActions', 'Quick Actions')}</h3>
          <GuardQuickActions 
            variant="grid"
            onEmergency={() => {}} // EmergencyPanicButton handles this
            onIncidentReport={() => setShowIncidentReport(true)}
          />
        </div>

        {/* Start Patrol Button */}
        <Button 
          size="lg" 
          className="w-full h-14 text-lg gap-3"
          onClick={() => navigate('/security/patrols/execute')}
        >
          <Play className="h-6 w-6" />
          {t('security.guard.startPatrol', 'Start Patrol')}
        </Button>
      </div>

      {/* Floating Emergency Button */}
      <EmergencyPanicButton variant="floating" />
      
      {/* Bottom Quick Actions Bar */}
      <GuardQuickActions 
        variant="bar"
        onIncidentReport={() => setShowIncidentReport(true)}
      />
    </div>
  );
}
