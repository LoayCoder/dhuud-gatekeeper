import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Battery,
  Shield,
  Route,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuardActivityTimeline } from './GuardActivityTimeline';

interface GuardDetailPanelProps {
  guardId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GuardProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  employee_id?: string;
}

interface ShiftInfo {
  id: string;
  shift_id: string;
  status: string;
  check_in_time?: string;
  check_out_time?: string;
  zone_name?: string;
  zone_id?: string;
  shift?: {
    name: string;
    start_time: string;
    end_time: string;
  };
}

interface PatrolLog {
  id: string;
  checkpoint_name: string;
  scanned_at: string;
  result: string;
  notes?: string;
}

interface LocationInfo {
  latitude: number;
  longitude: number;
  recorded_at: string;
  accuracy?: number;
  battery_level?: number;
  is_within_zone?: boolean;
  distance_from_zone?: number;
}

function useGuardDetails(guardId: string | null) {
  // Fetch guard profile
  const profileQuery = useQuery({
    queryKey: ['guard-profile', guardId],
    queryFn: async (): Promise<GuardProfile | null> => {
      if (!guardId) return null;
      const client = supabase as any;
      const { data, error } = await client
        .from('profiles')
        .select('id, full_name, avatar_url, employee_id')
        .eq('id', guardId)
        .single();
      if (error) throw error;
      return data as GuardProfile;
    },
    enabled: !!guardId,
  });

  // Fetch today's shift assignment
  const shiftQuery = useQuery({
    queryKey: ['guard-shift', guardId],
    queryFn: async (): Promise<ShiftInfo | null> => {
      if (!guardId) return null;
      const today = format(new Date(), 'yyyy-MM-dd');
      const client = supabase as any;
      const { data, error } = await client
        .from('shift_roster')
        .select(`
          id, shift_id, status, check_in_time, check_out_time, zone_id,
          zone:security_zones(zone_name),
          shift:security_shifts(name, start_time, end_time)
        `)
        .eq('guard_id', guardId)
        .eq('date', today)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      const row = data?.[0];
      if (!row) return null;
      
      return {
        ...row,
        zone_name: row.zone?.zone_name,
        shift: row.shift,
      };
    },
    enabled: !!guardId,
  });

  // Fetch recent patrol logs
  const patrolQuery = useQuery({
    queryKey: ['guard-patrols', guardId],
    queryFn: async (): Promise<PatrolLog[]> => {
      if (!guardId) return [];
      const client = supabase as any;
      const { data, error } = await client
        .from('patrol_checkpoint_logs')
        .select(`
          id, scanned_at, result, notes,
          checkpoint:patrol_checkpoints(name)
        `)
        .eq('scanned_by', guardId)
        .is('deleted_at', null)
        .order('scanned_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return (data || []).map((log: any) => ({
        ...log,
        checkpoint_name: log.checkpoint?.name || 'Unknown',
      }));
    },
    enabled: !!guardId,
  });

  // Fetch latest location
  const locationQuery = useQuery({
    queryKey: ['guard-location', guardId],
    queryFn: async (): Promise<LocationInfo | null> => {
      if (!guardId) return null;
      const { data, error } = await supabase
        .from('guard_tracking_history')
        .select('latitude, longitude, recorded_at, accuracy, battery_level, is_within_zone, distance_from_zone')
        .eq('guard_id', guardId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!guardId,
    refetchInterval: 15000,
  });

  return {
    profile: profileQuery.data,
    shift: shiftQuery.data,
    patrols: patrolQuery.data || [],
    location: locationQuery.data,
    isLoading: profileQuery.isLoading || shiftQuery.isLoading,
  };
}

export function GuardDetailPanel({ guardId, open, onOpenChange }: GuardDetailPanelProps) {
  const { t } = useTranslation();
  const { profile, shift, patrols, location, isLoading } = useGuardDetails(guardId);

  // Note: WhatsApp/Phone functionality would need phone number from a separate contact table
  // For now, we'll show buttons but they won't be functional without phone data
  const handleWhatsApp = () => {
    // TODO: Fetch phone from guards/contacts table when available
    // For demo, just show toast
  };

  const handlePhoneCall = () => {
    // TODO: Fetch phone from guards/contacts table when available  
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'checked_in': return 'bg-green-500';
      case 'scheduled': return 'bg-blue-500';
      case 'completed': return 'bg-muted-foreground';
      case 'absent': return 'bg-destructive';
      default: return 'bg-muted-foreground';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'checked_in': return t('security.guard.checkedIn', 'Checked In');
      case 'scheduled': return t('security.guard.scheduled', 'Scheduled');
      case 'completed': return t('security.guard.completed', 'Completed');
      case 'absent': return t('security.guard.absent', 'Absent');
      default: return t('security.guard.unknown', 'Unknown');
    }
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start gap-4">
            {isLoading ? (
              <Skeleton className="h-16 w-16 rounded-full" />
            ) : (
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </>
              ) : (
                <>
                  <SheetTitle className="text-start truncate">
                    {profile?.full_name || 'Unknown Guard'}
                  </SheetTitle>
                  <SheetDescription className="text-start">
                    {profile?.employee_id && (
                      <span className="me-2">ID: {profile.employee_id}</span>
                    )}
                  </SheetDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={cn('text-white', getStatusColor(shift?.status))}>
                      {getStatusLabel(shift?.status)}
                    </Badge>
                    {location?.is_within_zone === false && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 me-1" />
                        {t('security.guard.outsideZone', 'Outside Zone')}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2">
              <TabsTrigger value="overview" className="text-xs">
                <User className="h-3 w-3 me-1" />
                {t('security.guard.overview', 'Overview')}
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                <History className="h-3 w-3 me-1" />
                {t('security.guard.activity', 'Activity')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="p-6 space-y-6">
                  {/* Quick Actions */}
                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      variant="default"
                      onClick={handleWhatsApp}
                    >
                      <MessageCircle className="h-4 w-4 me-2" />
                      WhatsApp
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={handlePhoneCall}
                    >
                      <Phone className="h-4 w-4 me-2" />
                      {t('common.call', 'Call')}
                    </Button>
                  </div>

                  {/* Current Status */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {t('security.guard.currentStatus', 'Current Status')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {location ? (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t('security.guard.lastSeen', 'Last Seen')}</span>
                            <span className="font-medium">
                              {formatDistanceToNow(new Date(location.recorded_at), { addSuffix: true })}
                            </span>
                          </div>
                          {location.battery_level !== null && location.battery_level !== undefined && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Battery className="h-3 w-3" />
                                {t('security.guard.battery', 'Battery')}
                              </span>
                              <span className={cn(
                                'font-medium',
                                location.battery_level < 20 && 'text-destructive'
                              )}>
                                {location.battery_level}%
                              </span>
                            </div>
                          )}
                          {location.accuracy && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{t('security.guard.gpsAccuracy', 'GPS Accuracy')}</span>
                              <span className="font-medium">±{location.accuracy.toFixed(0)}m</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t('security.guard.zoneStatus', 'Zone Status')}</span>
                            {location.is_within_zone === false ? (
                              <Badge variant="destructive" className="text-xs">
                                <XCircle className="h-3 w-3 me-1" />
                                {t('security.guard.outsideZone', 'Outside')}
                                {location.distance_from_zone && ` (${location.distance_from_zone.toFixed(0)}m)`}
                              </Badge>
                            ) : (
                              <Badge variant="default" className="text-xs bg-green-500">
                                <CheckCircle className="h-3 w-3 me-1" />
                                {t('security.guard.insideZone', 'Inside Zone')}
                              </Badge>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          {t('security.guard.noLocation', 'No location data available')}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Shift Info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {t('security.guard.todayShift', "Today's Shift")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {shift ? (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t('security.guard.shift', 'Shift')}</span>
                            <span className="font-medium">{shift.shift?.name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t('security.guard.time', 'Time')}</span>
                            <span className="font-medium">
                              {shift.shift?.start_time?.slice(0, 5)} - {shift.shift?.end_time?.slice(0, 5)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t('security.guard.zone', 'Zone')}</span>
                            <Badge variant="secondary">{shift.zone_name || 'N/A'}</Badge>
                          </div>
                          {shift.check_in_time && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{t('security.guard.checkedInAt', 'Checked In')}</span>
                              <span className="font-medium">
                                {format(new Date(shift.check_in_time), 'HH:mm')}
                              </span>
                            </div>
                          )}
                          {shift.check_out_time && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{t('security.guard.checkedOutAt', 'Checked Out')}</span>
                              <span className="font-medium">
                                {format(new Date(shift.check_out_time), 'HH:mm')}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          {t('security.guard.noShift', 'No shift assigned today')}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Patrol History */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Route className="h-4 w-4" />
                        {t('security.guard.recentPatrols', 'Recent Patrol Scans')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {patrols.length > 0 ? (
                        <div className="space-y-2">
                          {patrols.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between py-2 border-b last:border-0"
                            >
                              <div className="flex items-center gap-2">
                                {log.result === 'success' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                                <div>
                                  <p className="text-sm font-medium">{log.checkpoint_name}</p>
                                  {log.notes && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">{log.notes}</p>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.scanned_at), 'HH:mm')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t('security.guard.noPatrols', 'No patrol scans recorded')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="activity" className="flex-1 overflow-hidden mt-0">
              <div className="p-6 h-[calc(100vh-16rem)]">
                <GuardActivityTimeline 
                  guardId={guardId} 
                  maxHeight="calc(100vh - 18rem)"
                  showHeader={true}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
