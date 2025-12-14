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
import { MapPin, AlertTriangle, Users, Clock, RefreshCw, CheckCircle, Radio, Eye, Shield } from 'lucide-react';
import { useGuardLocations, useGeofenceAlerts, useAcknowledgeAlert, useResolveAlert } from '@/hooks/use-live-tracking';
import { useShiftRoster } from '@/hooks/use-shift-roster';
import { useSecurityZones } from '@/hooks/use-security-zones';
import { cn } from '@/lib/utils';

export default function CommandCenter() {
  const { t } = useTranslation();
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: guardLocations, isLoading: locationsLoading, refetch: refetchLocations } = useGuardLocations();
  const { data: alerts } = useGeofenceAlerts({ status: 'pending' });
  const { data: acknowledgedAlerts } = useGeofenceAlerts({ status: 'acknowledged' });
  const { data: todayRoster } = useShiftRoster({ date: format(new Date(), 'yyyy-MM-dd') });
  const { data: zones } = useSecurityZones({ isActive: true });

  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();

  useEffect(() => { const i = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(i); }, []);

  const handleResolve = async () => {
    if (!selectedAlertId) return;
    await resolveAlert.mutateAsync({ alertId: selectedAlertId, notes: resolutionNotes });
    setResolveDialogOpen(false);
    setSelectedAlertId(null);
    setResolutionNotes('');
  };

  const checkedInCount = todayRoster?.filter(r => r.status === 'checked_in').length || 0;
  const scheduledCount = todayRoster?.filter(r => r.status === 'scheduled').length || 0;
  const completedCount = todayRoster?.filter(r => r.status === 'completed').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">{t('security.commandCenter.title', 'Command Center')}</h1><p className="text-muted-foreground">{t('security.commandCenter.description', 'Real-time monitoring')}</p></div>
        <div className="flex items-center gap-4"><div className="flex items-center gap-2 text-lg font-mono"><Clock className="h-5 w-5" />{format(currentTime, 'HH:mm:ss')}</div><Button variant="outline" onClick={() => refetchLocations()}><RefreshCw className="h-4 w-4 me-2" />{t('common.refresh', 'Refresh')}</Button></div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('security.commandCenter.onDuty', 'On Duty')}</p><p className="text-3xl font-bold text-green-600">{checkedInCount}</p></div><Users className="h-8 w-8 text-green-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('security.commandCenter.scheduled', 'Scheduled')}</p><p className="text-3xl font-bold text-blue-600">{scheduledCount}</p></div><Clock className="h-8 w-8 text-blue-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('security.commandCenter.completed', 'Completed')}</p><p className="text-3xl font-bold text-muted-foreground">{completedCount}</p></div><CheckCircle className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card className={cn((alerts?.length || 0) > 0 && "border-destructive bg-destructive/5")}><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('security.commandCenter.activeAlerts', 'Alerts')}</p><p className="text-3xl font-bold text-destructive">{alerts?.length || 0}</p></div><AlertTriangle className="h-8 w-8 text-destructive" /></div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-green-500 animate-pulse" />{t('security.commandCenter.liveTracking', 'Live Guard Positions')}</CardTitle></CardHeader>
          <CardContent>
            {locationsLoading ? <div className="animate-pulse space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded" />)}</div> : guardLocations?.length ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {guardLocations.map(loc => (
                    <div key={loc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                        <div><p className="font-medium">Guard {loc.guard_id?.slice(0, 8)}...</p><div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}</div></div>
                      </div>
                      <div className="text-xs text-muted-foreground">{format(new Date(loc.recorded_at), 'HH:mm:ss')}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : <div className="flex flex-col items-center py-12"><MapPin className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">{t('security.commandCenter.noActiveGuards', 'No guards tracking')}</p></div>}
          </CardContent>
        </Card>

        <Card className={cn((alerts?.length || 0) > 0 && "border-destructive")}>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className={cn("h-5 w-5", (alerts?.length || 0) > 0 ? "text-destructive animate-pulse" : "text-muted-foreground")} />{t('security.commandCenter.alerts', 'Alerts')}</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {(alerts?.length || 0) > 0 || (acknowledgedAlerts?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {alerts?.map(alert => (
                    <div key={alert.id} className="p-3 rounded-lg border border-destructive bg-destructive/5">
                      <div className="flex items-start justify-between gap-2">
                        <div><p className="font-medium text-destructive">{alert.alert_type}</p><p className="text-xs text-muted-foreground">{format(new Date(alert.created_at), 'HH:mm:ss')}</p></div>
                        <Button size="sm" variant="outline" onClick={() => acknowledgeAlert.mutate(alert.id)} disabled={acknowledgeAlert.isPending}><Eye className="h-3 w-3 me-1" />Ack</Button>
                      </div>
                    </div>
                  ))}
                  {acknowledgedAlerts?.map(alert => (
                    <div key={alert.id} className="p-3 rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                      <div className="flex items-start justify-between gap-2">
                        <div><div className="flex items-center gap-2"><p className="font-medium text-yellow-700 dark:text-yellow-500">{alert.alert_type}</p><Badge variant="outline" className="text-xs">Acknowledged</Badge></div></div>
                        <Button size="sm" onClick={() => { setSelectedAlertId(alert.id); setResolveDialogOpen(true); }}><CheckCircle className="h-3 w-3 me-1" />Resolve</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="flex flex-col items-center py-12"><CheckCircle className="h-12 w-12 text-green-500 mb-4" /><p className="text-muted-foreground">{t('security.commandCenter.noAlerts', 'No alerts')}</p></div>}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{t('security.commandCenter.zoneCoverage', 'Zone Coverage')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {zones?.slice(0, 8).map(zone => (
              <div key={zone.id} className="p-3 rounded-lg border bg-muted">
                <div className="flex items-center justify-between mb-2"><span className="font-medium">{zone.zone_name}</span><Badge variant="secondary">{zone.zone_code}</Badge></div>
                <div className="text-xs text-muted-foreground">{zone.zone_type} • {zone.risk_level}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('security.commandCenter.resolveAlert', 'Resolve Alert')}</DialogTitle></DialogHeader>
          <div className="space-y-4"><div className="space-y-2"><Label>{t('security.commandCenter.resolutionNotes', 'Resolution Notes')}</Label><Textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} rows={4} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setResolveDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button><Button onClick={handleResolve} disabled={!resolutionNotes.trim() || resolveAlert.isPending}><CheckCircle className="h-4 w-4 me-2" />{t('security.commandCenter.markResolved', 'Mark Resolved')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
