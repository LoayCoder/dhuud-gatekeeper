import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { 
  AlertTriangle, 
  AlertOctagon,
  Shield,
  Heart,
  Flame,
  Clock,
  CheckCircle,
  Filter,
  RefreshCw,
  TrendingUp,
  Timer,
  Download,
  ChevronDown,
  Settings2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmergencyAlertsList } from '@/components/security/EmergencyAlertsList';
import { EmergencyPanicButton } from '@/components/security/EmergencyPanicButton';
import { EmergencySLAConfig } from '@/components/security/EmergencySLAConfig';
import { ProtocolTemplatesManager } from '@/components/security/ProtocolTemplatesManager';
import { 
  useEmergencyAlerts, 
  useRealtimeEmergencyAlerts 
} from '@/hooks/use-emergency-alerts';
import { cn } from '@/lib/utils';

export default function EmergencyAlerts() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');
  const [showProtocolTemplates, setShowProtocolTemplates] = useState(false);
  
  // Fetch all alerts for stats
  const { data: allAlerts, isLoading, refetch } = useEmergencyAlerts('all');
  useRealtimeEmergencyAlerts();

  // Calculate stats
  const activeCount = allAlerts?.filter(a => !a.acknowledged_at && !a.resolved_at).length ?? 0;
  const acknowledgedCount = allAlerts?.filter(a => a.acknowledged_at && !a.resolved_at).length ?? 0;
  const resolvedCount = allAlerts?.filter(a => !!a.resolved_at).length ?? 0;
  const falseAlarmCount = allAlerts?.filter(a => a.is_false_alarm).length ?? 0;

  // Calculate average response time (in minutes)
  const alertsWithResponse = allAlerts?.filter(a => a.response_time_seconds) ?? [];
  const avgResponseTime = alertsWithResponse.length > 0
    ? Math.round(alertsWithResponse.reduce((sum, a) => sum + (a.response_time_seconds || 0), 0) / alertsWithResponse.length / 60)
    : 0;

  // Get alert type breakdown
  const alertTypeBreakdown = allAlerts?.reduce((acc, alert) => {
    acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'panic': return <AlertOctagon className="h-4 w-4" />;
      case 'security_breach': return <Shield className="h-4 w-4" />;
      case 'medical': return <Heart className="h-4 w-4" />;
      case 'fire': return <Flame className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            {t('security.emergencyAlerts', 'Emergency Alerts')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.emergencyAlertsPageDesc', 'Monitor, acknowledge, and resolve emergency alerts across all sites')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowProtocolTemplates(true)}>
            <FileText className="h-4 w-4 me-2" />
            {isRTL ? 'البروتوكولات' : 'Protocols'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 me-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
          <EmergencyPanicButton variant="compact" />
        </div>
      </div>

      {/* Protocol Templates Manager */}
      <ProtocolTemplatesManager 
        open={showProtocolTemplates} 
        onOpenChange={setShowProtocolTemplates} 
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className={cn(activeCount > 0 && 'border-destructive bg-destructive/5')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.activeAlerts', 'Active Alerts')}
            </CardTitle>
            <AlertOctagon className={cn('h-4 w-4', activeCount > 0 ? 'text-destructive animate-pulse' : 'text-muted-foreground')} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className={cn('text-2xl font-bold', activeCount > 0 && 'text-destructive')}>
                  {activeCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('security.requiresImmediateAction', 'Requires immediate action')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.acknowledged', 'Acknowledged')}
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-warning">{acknowledgedCount}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.pendingResolution', 'Pending resolution')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.resolved', 'Resolved')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-success">{resolvedCount}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.closedAlerts', 'Closed alerts')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.avgResponseTime', 'Avg Response')}
            </CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{avgResponseTime}m</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.timeToAcknowledge', 'Time to acknowledge')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.falseAlarms', 'False Alarms')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{falseAlarmCount}</div>
                <p className="text-xs text-muted-foreground">
                  {resolvedCount > 0 
                    ? `${Math.round((falseAlarmCount / resolvedCount) * 100)}% ${t('security.ofResolved', 'of resolved')}`
                    : t('security.noResolvedYet', 'No resolved yet')
                  }
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Type Breakdown */}
      {Object.keys(alertTypeBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('security.alertTypeBreakdown', 'Alert Type Breakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(alertTypeBreakdown).map(([type, count]) => (
                <div 
                  key={type}
                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg"
                >
                  {getAlertTypeIcon(type)}
                  <span className="capitalize font-medium">{type.replace('_', ' ')}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts List with Tabs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t('security.alertsList', 'Alerts List')}</CardTitle>
              <CardDescription>
                {t('security.alertsListDesc', 'View and manage all emergency alerts')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                {t('common.all', 'All')}
                <Badge variant="secondary" className="text-xs">
                  {allAlerts?.length ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-2">
                {t('security.active', 'Active')}
                {activeCount > 0 && (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    {activeCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="acknowledged" className="flex items-center gap-2">
                {t('security.acknowledged', 'Acknowledged')}
                {acknowledgedCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {acknowledgedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex items-center gap-2">
                {t('security.resolved', 'Resolved')}
                <Badge variant="outline" className="text-xs">
                  {resolvedCount}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <EmergencyAlertsList statusFilter="all" showHeader={false} />
            </TabsContent>
            <TabsContent value="active">
              <EmergencyAlertsList statusFilter="active" showHeader={false} />
            </TabsContent>
            <TabsContent value="acknowledged">
              <EmergencyAlertsList statusFilter="acknowledged" showHeader={false} />
            </TabsContent>
            <TabsContent value="resolved">
              <EmergencyAlertsList statusFilter="resolved" showHeader={false} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* SLA Configuration Section */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">
                      {t('security.emergencySLAConfig', 'Emergency Response SLA')}
                    </CardTitle>
                    <CardDescription>
                      {t('security.emergencySLAConfigDesc', 'Configure response time targets and escalation rules')}
                    </CardDescription>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <EmergencySLAConfig />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Floating Panic Button for Mobile */}
      <EmergencyPanicButton variant="floating" />
    </div>
  );
}
