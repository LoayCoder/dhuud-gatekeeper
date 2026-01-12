import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ShieldAlert, Timer, Shield, MapPin } from 'lucide-react';
import { useGuardLocations, useGeofenceAlerts, useAcknowledgeAlert, useResolveAlert } from '@/hooks/use-live-tracking';
import { useShiftRoster } from '@/hooks/use-shift-roster';
import { useSecurityZones } from '@/hooks/use-security-zones';
import { useRealtimeTracking } from '@/hooks/use-realtime-tracking';
import { useTrackingInterval, useUpdateTrackingInterval } from '@/hooks/use-tracking-settings';
import { generateShiftReportPDF } from '@/lib/shift-report-pdf';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { GuardDetailPanel } from '@/components/security/GuardDetailPanel';
import { EmergencyAlertBanner } from '@/components/security/EmergencyAlertBanner';
import { TacticalHeader } from '@/components/security/TacticalHeader';
import { TacticalStatsGrid } from '@/components/security/TacticalStatsGrid';
import { TacticalAlertPanel } from '@/components/security/TacticalAlertPanel';
import { TacticalMap } from '@/components/security/TacticalMap';


export default function CommandCenter() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
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
      const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data: tenant } = await supabase.from('tenants').select('name').eq('id', profile.tenant_id).single();

      const { data, error } = await supabase.functions.invoke('generate-shift-report', {
        body: {
          shift_id: todayRoster[0].shift_id,
          date: format(new Date(), 'yyyy-MM-dd'),
          tenant_id: profile.tenant_id,
        },
      });

      if (error) throw error;
      if (!data?.success || !data?.report) throw new Error('Failed to generate report');

      const pdfBlob = await generateShiftReportPDF(data.report, {
        tenantName: tenant?.name || 'Security',
      });

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

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert.mutate(alertId);
  };

  const handleResolveClick = (alertId: string) => {
    setSelectedAlertId(alertId);
    setResolveDialogOpen(true);
  };

  return (
    <div className="tactical-bg min-h-screen -m-6 p-6">
      {/* Tactical Header */}
      <TacticalHeader
        isConnected={isConnected}
        alertCount={alerts?.length || 0}
        onRefresh={() => refetchLocations()}
        onGenerateReport={handleGenerateReport}
        generatingReport={generatingReport}
      />

      <div className="space-y-6 mt-6">
        {/* Emergency Alert Banner */}
        <EmergencyAlertBanner />

        {/* Stats Grid */}
        <TacticalStatsGrid
          onDuty={checkedInCount}
          scheduled={scheduledCount}
          completed={completedCount}
          alerts={alerts?.length || 0}
          securityScore={85}
        />

        {/* Quick Access Links */}
        <div className="flex gap-3 flex-wrap">
          <Link 
            to="/security/blacklist" 
            className="tactical-btn flex items-center gap-2"
          >
            <ShieldAlert className="h-4 w-4" />
            {t('security.commandCenter.blacklist', 'Blacklist Management')}
          </Link>
        </div>

        {/* Map and Alerts */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TacticalMap
              guardLocations={mapGuardLocations}
              zones={mapZones}
              alerts={mapAlerts}
              onGuardClick={handleGuardClick}
            />
          </div>

          <TacticalAlertPanel
            pendingAlerts={alerts || []}
            acknowledgedAlerts={acknowledgedAlerts || []}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolveClick}
            isAcknowledging={acknowledgeAlert.isPending}
          />
        </div>

        {/* Settings and Zone Coverage */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Tracking Settings */}
          <div className="tactical-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Timer className="h-5 w-5 tactical-text-accent" />
              <span className="text-sm font-medium uppercase tracking-wider tactical-text">
                {t('security.tactical.trackingSettings', 'Tracking Settings')}
              </span>
            </div>
            <p className="text-xs tactical-text-dim mb-4">
              {t('security.commandCenter.trackingDescription', 'Configure guard location update frequency')}
            </p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm tactical-text-dim">
                  {t('security.commandCenter.updateInterval', 'Update Interval')}
                </span>
                <span className="px-2 py-1 rounded tactical-mono text-sm bg-[hsl(var(--tactical-accent)/0.2)] tactical-text-accent">
                  {currentIntervalValue} {t('common.min', 'min')}
                </span>
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
              <div className="flex justify-between text-[10px] tactical-text-dim tactical-mono">
                <span>1 MIN</span>
                <span>15 MIN</span>
                <span>30 MIN</span>
              </div>
              {lastUpdate && (
                <div className="pt-3 border-t border-[hsl(var(--tactical-border))]">
                  <p className="text-xs tactical-text-dim">
                    {t('security.commandCenter.lastUpdate', 'Last update')}: 
                    <span className="tactical-mono ms-1 tactical-text-accent">
                      {format(lastUpdate, 'HH:mm:ss')}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Zone Coverage */}
          <div className="tactical-card p-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 tactical-text-accent" />
              <span className="text-sm font-medium uppercase tracking-wider tactical-text">
                {t('security.tactical.zoneCoverage', 'Zone Coverage')}
              </span>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {zones?.slice(0, 6).map(zone => (
                <div 
                  key={zone.id} 
                  className="p-3 rounded-lg border border-[hsl(var(--tactical-border))] bg-[hsl(var(--tactical-surface))]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm tactical-text truncate">{zone.zone_name}</span>
                    <span className="px-1.5 py-0.5 text-[9px] rounded tactical-mono bg-[hsl(var(--tactical-accent)/0.2)] tactical-text-accent">
                      {zone.zone_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] tactical-text-dim">
                    <MapPin className="h-3 w-3" />
                    <span className="uppercase">{zone.zone_type}</span>
                    <span>•</span>
                    <span className={cn(
                      'uppercase font-medium',
                      zone.risk_level === 'high' && 'tactical-text-critical',
                      zone.risk_level === 'medium' && 'tactical-text-warning',
                      zone.risk_level === 'low' && 'tactical-text-accent'
                    )}>
                      {zone.risk_level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="bg-[hsl(var(--tactical-surface))] border-[hsl(var(--tactical-border))]">
          <DialogHeader>
            <DialogTitle className="tactical-text">
              {t('security.commandCenter.resolveAlert', 'Resolve Alert')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="tactical-text-dim">{t('security.commandCenter.resolutionNotes', 'Resolution Notes')}</Label>
              <Textarea 
                value={resolutionNotes} 
                onChange={(e) => setResolutionNotes(e.target.value)} 
                rows={4}
                className="bg-[hsl(var(--tactical-bg))] border-[hsl(var(--tactical-border))] tactical-text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={handleResolve} 
              disabled={!resolutionNotes.trim() || resolveAlert.isPending}
              className="tactical-btn-primary"
            >
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
