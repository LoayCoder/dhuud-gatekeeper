import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Users, Truck, HardHat, AlertTriangle, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useGateGuardStats, useGateAlerts } from '@/hooks/use-gate-guard-stats';
import { GateAlertCards } from '@/components/security/GateAlertCards';
import { VisitorVerificationPanel } from '@/components/security/VisitorVerificationPanel';
import { GateActivityCharts } from '@/components/security/GateActivityCharts';
import { ActiveVisitorsList } from '@/components/security/ActiveVisitorsList';
import { WorkerApprovalQueueWrapper } from '@/components/security/WorkerApprovalQueueWrapper';
import { WorkerVerificationPanel } from '@/components/security/WorkerVerificationPanel';
import { TodayGatePassesWrapper } from '@/components/security/TodayGatePassesWrapper';
import { GateLogTable } from '@/components/security/GateLogTable';
import { cn } from '@/lib/utils';

const GateGuardDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('visitors');
  
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGateGuardStats();
  const { data: alerts = [], refetch: refetchAlerts } = useGateAlerts();

  const handleRefresh = () => {
    refetchStats();
    refetchAlerts();
  };

  const handleDismissAlert = (alertId: string) => {
    // TODO: Implement alert dismissal
    console.log('Dismiss alert:', alertId);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    // TODO: Implement alert acknowledgment
    console.log('Acknowledge alert:', alertId);
  };

  const statCards = [
    {
      label: t('security.gateDashboard.stats.onSite', 'On Site'),
      value: stats?.onSite ?? 0,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: t('security.gateDashboard.stats.visitorsToday', "Today's Visitors"),
      value: stats?.visitorsToday ?? 0,
      icon: Truck,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: t('security.gateDashboard.stats.activeWorkers', 'Active Workers'),
      value: stats?.activeWorkers ?? 0,
      icon: HardHat,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: t('security.gateDashboard.stats.openAlerts', 'Open Alerts'),
      value: stats?.openAlerts ?? 0,
      icon: AlertTriangle,
      color: stats?.openAlerts && stats.openAlerts > 0 ? 'text-destructive' : 'text-muted-foreground',
      bgColor: stats?.openAlerts && stats.openAlerts > 0 ? 'bg-destructive/10' : 'bg-muted/50',
    },
  ];

  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            {t('security.gateDashboard.title', 'Gate Guard Dashboard')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('security.gateDashboard.description', 'Central control for gate operations')}
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{stat.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert Cards Section */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {t('security.gateDashboard.activeAlerts', 'Active Alerts')}
            <Badge variant="destructive" className="text-xs">
              {alerts.length}
            </Badge>
          </h2>
          <GateAlertCards
            alerts={alerts}
            onDismiss={handleDismissAlert}
            onAcknowledge={handleAcknowledgeAlert}
          />
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full md:w-auto md:inline-grid">
          <TabsTrigger value="visitors" className="gap-1">
            <Users className="h-4 w-4 hidden sm:block" />
            {t('security.gateDashboard.tabs.visitors', 'Visitors')}
          </TabsTrigger>
          <TabsTrigger value="workers" className="gap-1">
            <HardHat className="h-4 w-4 hidden sm:block" />
            {t('security.gateDashboard.tabs.workers', 'Workers')}
          </TabsTrigger>
          <TabsTrigger value="gatePasses" className="gap-1">
            <Truck className="h-4 w-4 hidden sm:block" />
            {t('security.gateDashboard.tabs.gatePasses', 'Gate Passes')}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1">
            <Activity className="h-4 w-4 hidden sm:block" />
            {t('security.gateDashboard.tabs.activityLog', 'Activity')}
          </TabsTrigger>
        </TabsList>

        {/* Visitors Tab */}
        <TabsContent value="visitors" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <VisitorVerificationPanel />
            <ActiveVisitorsList />
          </div>
        </TabsContent>

        {/* Workers Tab */}
        <TabsContent value="workers" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <WorkerVerificationPanel />
            <WorkerApprovalQueueWrapper />
          </div>
        </TabsContent>

        {/* Gate Passes Tab */}
        <TabsContent value="gatePasses" className="space-y-4 mt-4">
          <TodayGatePassesWrapper />
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-4 mt-4">
          {stats && (
            <GateActivityCharts
              hourlyTrend={stats.hourlyTrend}
              entryTypeBreakdown={stats.entryTypeBreakdown}
            />
          )}
          <Card>
            <CardContent className="p-4">
              <GateLogTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GateGuardDashboard;
