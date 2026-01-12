import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { MapPin, AlertTriangle, Users, Clock, RefreshCw, CheckCircle, Radio, Eye, Shield, FileText, Download, ShieldAlert, Settings, Timer } from 'lucide-react';
import { useGuardLocations, useGeofenceAlerts, useAcknowledgeAlert, useResolveAlert } from '@/hooks/use-live-tracking';
import { useShiftRoster } from '@/hooks/use-shift-roster';
import { useSecurityZones } from '@/hooks/use-security-zones';
import { useRealtimeTracking } from '@/hooks/use-realtime-tracking';
import { useTrackingInterval, useUpdateTrackingInterval } from '@/hooks/use-tracking-settings';
import { CommandCenterMap } from '@/components/security/CommandCenterMap';
import { generateShiftReportPDF } from '@/lib/shift-report-pdf';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SecurityScoreCard } from '@/components/security/SecurityScoreCard';
import { EmergencyAlertBanner } from '@/components/security/EmergencyAlertBanner';
import { Link } from 'react-router-dom';
import { GuardDetailPanel } from '@/components/security/GuardDetailPanel';
export default function CommandCenter() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedGuardId, setSelectedGuardId] = useState<string | null>(null);
  const [guardPanelOpen, setGuardPanelOpen] = useState(false);

  const { data: guardLocations, isLoading: locationsLoading, refetch: refetchLocations } = useGuardLocations();
  const { data: alerts } = useGeofenceAlerts('pending');
  const { data: acknowledgedAlerts } = useGeofenceAlerts('acknowledged');
  const { data: todayRoster } = useShiftRoster({ date: format(new Date(), 'yyyy-MM-dd') });
  const { data: zones } = useSecurityZones({ isActive: true });

  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();
  
  // Tracking settings
  const { data: trackingSettings, isLoading: settingsLoading } = useTrackingInterval();
  const updateInterval = useUpdateTrackingInterval();
  
  // Real-time updates
  const { isConnected, lastUpdate, newAlertCount, acknowledgeAlerts } = useRealtimeTracking(true);

  useEffect(() => { const i = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(i); }, []);

  // Acknowledge new alerts when viewed
  useEffect(() => {
    if (newAlertCount > 0) {
      acknowledgeAlerts();
    }
  }, [newAlertCount, acknowledgeAlerts]);

  const handleResolve = async () => {
    if (!selectedAlertId) return;
    await resolveAlert.mutateAsync({ alertId: selectedAlertId, notes: resolutionNotes });
    setResolveDialogOpen(false);
    setSelectedAlertId(null);
    setResolutionNotes('');
  };

  const handleGenerateReport = async () => {
    if (!todayRoster || todayRoster.length === 0) {
      toast({ title: t('security.commandCenter.noShiftData', 'No shift data available'), variant: 'destructive' });
      return;
    }

    setGeneratingReport(true);
    try {
      // Get tenant info
      const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data: tenant } = await supabase.from('tenants').select('name').eq('id', profile.tenant_id).single();

      // Call edge function
      const { data, error } = await supabase.functions.invoke('generate-shift-report', {
        body: {
          shift_id: todayRoster[0].shift_id,
          date: format(new Date(), 'yyyy-MM-dd'),
          tenant_id: profile.tenant_id,
        },
      });

      if (error) throw error;
      if (!data?.success || !data?.report) throw new Error('Failed to generate report');

      // Generate PDF
      const pdfBlob = await generateShiftReportPDF(data.report, {
        tenantName: tenant?.name || 'Security',
      });

      // Download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shift-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: t('security.commandCenter.reportGenerated', 'Report generated successfully') });
    } catch (error) {
      console.error('Report generation error:', error);
      toast({ title: t('security.commandCenter.reportError', 'Failed to generate report'), variant: 'destructive' });
    } finally {
      setGeneratingReport(false);
    }
  };

  const checkedInCount = todayRoster?.filter(r => r.status === 'checked_in').length || 0;
  const scheduledCount = todayRoster?.filter(r => r.status === 'scheduled').length || 0;
  const completedCount = todayRoster?.filter(r => r.status === 'completed').length || 0;

  // Transform data for map
  const mapGuardLocations = guardLocations?.map((loc: any) => ({
    id: loc.id,
    guard_id: loc.guard_id || '',
    guard_name: loc.guard_name || 'Unknown',
    latitude: loc.latitude || 0,
    longitude: loc.longitude || 0,
    recorded_at: loc.recorded_at,
    accuracy: loc.accuracy,
    battery_level: loc.battery_level,
    is_within_zone: loc.is_within_zone,
  })) || [];

  const mapZones = zones?.map(zone => {
    // Parse polygon_coords from JSONB - it could be stored as array or need parsing
    let coords: number[][] = [];
    if (zone.polygon_coords) {
      try {
        coords = Array.isArray(zone.polygon_coords) 
          ? zone.polygon_coords as number[][]
          : JSON.parse(zone.polygon_coords as unknown as string);
      } catch {
        coords = [];
      }
    }
    return {
      id: zone.id,
      zone_name: zone.zone_name,
      zone_code: zone.zone_code,
      zone_type: zone.zone_type || 'building',
      risk_level: zone.risk_level || 'medium',
      polygon_coords: coords,
      is_active: zone.is_active ?? true,
    };
  }) || [];

  const mapAlerts = alerts?.map((alert: any) => ({
    id: alert.id,
    guard_id: alert.guard_id || '',
    guard_name: alert.guard_name || 'Unknown',
    alert_type: alert.alert_type,
    severity: alert.severity,
    latitude: alert.latitude,
    longitude: alert.longitude,
  })) || [];

  const currentIntervalValue = trackingSettings?.current || trackingSettings?.default || 5;

  const handleGuardClick = (guardId: string) => {
    setSelectedGuardId(guardId);
    setGuardPanelOpen(true);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('security.commandCenter.title', 'Command Center')}</h1>
          <p className="text-muted-foreground">{t('security.commandCenter.description', 'Real-time monitoring')}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <Badge variant={isConnected ? 'default' : 'outline'} className={cn(isConnected && 'bg-green-500')}>
            <Radio className={cn("h-3 w-3 me-1", isConnected && "animate-pulse")} />
            {isConnected ? t('security.commandCenter.live', 'Live') : t('security.commandCenter.connecting', 'Connecting...')}
          </Badge>
          <div className="flex items-center gap-2 text-lg font-mono">
            <Clock className="h-5 w-5" />
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <Button variant="outline" onClick={() => refetchLocations()}>
            <RefreshCw className="h-4 w-4 me-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
          <Button onClick={handleGenerateReport} disabled={generatingReport}>
            <FileText className="h-4 w-4 me-2" />
            {generatingReport ? t('common.generating', 'Generating...') : t('security.commandCenter.generateReport', 'Report')}
          </Button>
        </div>
      </div>

      {/* Emergency Alert Banner */}
      <EmergencyAlertBanner />

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <SecurityScoreCard compact className="md:col-span-1" />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('security.commandCenter.onDuty', 'On Duty')}</p>
                <p className="text-3xl font-bold text-green-600">{checkedInCount}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('security.commandCenter.scheduled', 'Scheduled')}</p>
                <p className="text-3xl font-bold text-blue-600">{scheduledCount}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('security.commandCenter.completed', 'Completed')}</p>
                <p className="text-3xl font-bold text-muted-foreground">{completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn((alerts?.length || 0) > 0 && "border-destructive bg-destructive/5")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('security.commandCenter.activeAlerts', 'Alerts')}</p>
                <p className="text-3xl font-bold text-destructive">{alerts?.length || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Links */}
      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" asChild>
          <Link to="/security/blacklist" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            {t('security.commandCenter.blacklist', 'Blacklist Management')}
          </Link>
        </Button>
      </div>

      {/* Map and Alerts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CommandCenterMap
            guardLocations={mapGuardLocations}
            zones={mapZones}
            alerts={mapAlerts}
            onGuardClick={handleGuardClick}
          />
        </div>

        <Card className={cn((alerts?.length || 0) > 0 && "border-destructive")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={cn("h-5 w-5", (alerts?.length || 0) > 0 ? "text-destructive animate-pulse" : "text-muted-foreground")} />
              {t('security.commandCenter.alerts', 'Alerts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {(alerts?.length || 0) > 0 || (acknowledgedAlerts?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {alerts?.map((alert: any) => (
                    <div key={alert.id} className="p-3 rounded-lg border border-destructive bg-destructive/5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-destructive">{alert.alert_type}</p>
                            {alert.severity && (
                              <Badge variant="destructive" className="text-xs uppercase">
                                {alert.severity}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium truncate">{alert.guard_name}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(alert.created_at), 'HH:mm:ss')}</p>
                          {alert.alert_message && (
                            <p className="text-xs mt-1 text-muted-foreground line-clamp-2">{alert.alert_message}</p>
                          )}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => acknowledgeAlert.mutate(alert.id)} disabled={acknowledgeAlert.isPending}>
                          <Eye className="h-3 w-3 me-1" />
                          {t('security.commandCenter.acknowledge', 'Ack')}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {acknowledgedAlerts?.map((alert: any) => (
                    <div key={alert.id} className="p-3 rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-yellow-700 dark:text-yellow-500">{alert.alert_type}</p>
                            <Badge variant="outline" className="text-xs">{t('security.commandCenter.acknowledged', 'Acknowledged')}</Badge>
                          </div>
                          <p className="text-sm font-medium truncate">{alert.guard_name}</p>
                        </div>
                        <Button size="sm" onClick={() => { setSelectedAlertId(alert.id); setResolveDialogOpen(true); }}>
                          <CheckCircle className="h-3 w-3 me-1" />
                          {t('security.commandCenter.resolve', 'Resolve')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-muted-foreground">{t('security.commandCenter.noAlerts', 'No alerts')}</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Settings and Zone Coverage */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tracking Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="h-5 w-5" />
              {t('security.commandCenter.trackingSettings', 'Tracking Settings')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('security.commandCenter.trackingDescription', 'Configure guard location update frequency')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">{t('security.commandCenter.updateInterval', 'Update Interval')}</span>
                <Badge variant="secondary" className="font-mono">
                  {currentIntervalValue} {t('common.min', 'min')}
                </Badge>
              </div>
              <Slider
                value={[currentIntervalValue]}
                min={1}
                max={30}
                step={1}
                onValueCommit={(value) => updateInterval.mutate(value[0])}
                disabled={updateInterval.isPending || settingsLoading}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 {t('common.min', 'min')}</span>
                <span>15 {t('common.min', 'min')}</span>
                <span>30 {t('common.min', 'min')}</span>
              </div>
            </div>
            {lastUpdate && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  {t('security.commandCenter.lastUpdate', 'Last update')}: {format(lastUpdate, 'HH:mm:ss')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zone Coverage */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5" />
              {t('security.commandCenter.zoneCoverage', 'Zone Coverage')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {zones?.slice(0, 6).map(zone => (
                <div key={zone.id} className="p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">{zone.zone_name}</span>
                    <Badge variant="secondary" className="text-xs">{zone.zone_code}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{zone.zone_type} • {zone.risk_level}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('security.commandCenter.resolveAlert', 'Resolve Alert')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('security.commandCenter.resolutionNotes', 'Resolution Notes')}</Label>
              <Textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleResolve} disabled={!resolutionNotes.trim() || resolveAlert.isPending}>
              <CheckCircle className="h-4 w-4 me-2" />
              {t('security.commandCenter.markResolved', 'Mark Resolved')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guard Detail Panel */}
      <GuardDetailPanel
        guardId={selectedGuardId}
        open={guardPanelOpen}
        onOpenChange={setGuardPanelOpen}
      />
    </div>
  );
}
