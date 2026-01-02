import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  X, 
  MapPin, 
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmergencyProtocolExecution } from './EmergencyProtocolExecution';

interface EmergencyAlert {
  id: string;
  alert_type: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  status: string;
  source_type?: string;
  source_name?: string;
  source_id?: string;
  guard_id?: string;
}

interface EmergencyAlertBannerProps {
  className?: string;
  maxVisible?: number;
}

export function EmergencyAlertBanner({ className, maxVisible = 3 }: EmergencyAlertBannerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [expanded, setExpanded] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [protocolOpen, setProtocolOpen] = useState(false);

  const { data: alerts = [], refetch } = useQuery({
    queryKey: ['active-emergency-alerts'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .single();

      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('id, alert_type, latitude, longitude, created_at, source_type, source_name, source_id, guard_id, resolved_at')
        .eq('tenant_id', profile.tenant_id)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        status: d.resolved_at ? 'resolved' : 'pending',
        description: undefined,
      })) as EmergencyAlert[];
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('emergency-alerts-banner')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_alerts' },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (alerts.length === 0) return null;

  const visibleAlerts = expanded ? alerts : alerts.slice(0, maxVisible);
  const hasMore = alerts.length > maxVisible;

  const handleAlertClick = (alert: EmergencyAlert) => {
    setSelectedAlert(alert);
    setProtocolOpen(true);
  };

  return (
    <>
      <div className={cn(
        'rounded-lg border-2 border-destructive bg-destructive/5 overflow-hidden',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
            <span className="font-semibold text-destructive">
              {isRTL ? 'تنبيهات طوارئ نشطة' : 'Active Emergency Alerts'}
            </span>
            <Badge variant="destructive" className="animate-pulse">
              {alerts.length}
            </Badge>
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-7 px-2"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span className="ms-1 text-xs">
                {expanded 
                  ? (isRTL ? 'طي' : 'Collapse') 
                  : (isRTL ? `${alerts.length - maxVisible}+ المزيد` : `${alerts.length - maxVisible}+ more`)}
              </span>
            </Button>
          )}
        </div>

        {/* Alert List */}
        <div className="divide-y divide-destructive/20">
          {visibleAlerts.map((alert) => (
            <button
              key={alert.id}
              onClick={() => handleAlertClick(alert)}
              className="w-full px-4 py-3 text-start hover:bg-destructive/10 transition-colors flex items-center gap-3"
            >
              <div className="p-2 rounded-full bg-destructive/20 shrink-0">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{alert.alert_type}</span>
                  {alert.source_name && (
                    <span className="text-sm text-muted-foreground">
                      - {alert.source_name}
                    </span>
                  )}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-xs',
                      alert.status === 'escalated' && 'border-orange-500 text-orange-500'
                    )}
                  >
                    {alert.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(alert.created_at), 'HH:mm')}
                  </span>
                  {alert.latitude && alert.longitude && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {alert.latitude.toFixed(2)}, {alert.longitude.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {isRTL ? 'بدء البروتوكول' : 'Start Protocol'}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Protocol Execution Dialog */}
      <EmergencyProtocolExecution
        open={protocolOpen}
        onOpenChange={setProtocolOpen}
        alert={selectedAlert}
      />
    </>
  );
}
