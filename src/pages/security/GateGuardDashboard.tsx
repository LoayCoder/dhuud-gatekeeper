import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Users, Truck, HardHat, AlertTriangle, Activity, Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGateGuardStats, useGateAlerts } from '@/hooks/use-gate-guard-stats';
import { GateAlertCards } from '@/components/security/GateAlertCards';
import { VisitorVerificationPanel } from '@/components/security/VisitorVerificationPanel';
import { GateActivityCharts } from '@/components/security/GateActivityCharts';
import { ActiveVisitorsList } from '@/components/security/ActiveVisitorsList';
import { WorkerScanHistory } from '@/components/security/WorkerScanHistory';
import { WorkerVerificationPanel } from '@/components/security/WorkerVerificationPanel';
import { TodayGatePassesWrapper } from '@/components/security/TodayGatePassesWrapper';
import { GateLogTable } from '@/components/security/GateLogTable';
import { GatePassListTable } from '@/components/contractors/GatePassListTable';
import { GatePassApprovalQueue } from '@/components/contractors/GatePassApprovalQueue';
import { useMaterialGatePasses, usePendingGatePassApprovals } from '@/hooks/contractor-management/use-material-gate-passes';
import { useContractorProjects } from '@/hooks/contractor-management/use-contractor-projects';
import { cn } from '@/lib/utils';

const GateGuardDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('visitors');
  
  // Gate pass sub-tab state
  const [gatePassTab, setGatePassTab] = useState('today');
  const [gatePassSearch, setGatePassSearch] = useState('');
  const [gatePassStatus, setGatePassStatus] = useState('all');
  const [gatePassProject, setGatePassProject] = useState('all');
  
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGateGuardStats();
  const { data: alerts = [], refetch: refetchAlerts } = useGateAlerts();
  
  // Gate pass data
  const { data: allGatePasses = [], isLoading: passesLoading } = useMaterialGatePasses({
    search: gatePassSearch || undefined,
    status: gatePassStatus !== 'all' ? gatePassStatus : undefined,
    projectId: gatePassProject !== 'all' ? gatePassProject : undefined,
  });
  const { data: pendingApprovals = [] } = usePendingGatePassApprovals();
  const { data: projects = [] } = useContractorProjects({ status: 'active' });

  const handleRefresh = () => {
    refetchStats();
    refetchAlerts();
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      // Geofence alerts are stored in geofence_alerts table
      if (alertId && alertId !== 'pending-passes') {
        await supabase.from('geofence_alerts')
          .update({ resolved_at: new Date().toISOString() })
          .eq('id', alertId);
      }
      refetchAlerts();
    } catch {
      // Silent failure - alerts will refresh on next cycle
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      // Geofence alerts are stored in geofence_alerts table
      if (alertId && alertId !== 'pending-passes') {
        await supabase.from('geofence_alerts')
          .update({ acknowledged_at: new Date().toISOString() })
          .eq('id', alertId);
      }
      refetchAlerts();
    } catch {
      // Silent failure - alerts will refresh on next cycle
    }
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
          </div>
        </TabsContent>

        {/* Workers Tab */}
        <TabsContent value="workers" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <WorkerVerificationPanel />
            <ActiveVisitorsList />
          </div>
          <WorkerScanHistory />
        </TabsContent>

        {/* Gate Passes Tab */}
        <TabsContent value="gatePasses" className="space-y-4 mt-4">
          <Tabs value={gatePassTab} onValueChange={setGatePassTab}>
            <TabsList className="w-full md:w-auto md:inline-grid grid-cols-3">
              <TabsTrigger value="today">
                {t('contractors.gatePasses.todayPasses', "Today's Passes")}
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-1">
                {t('contractors.gatePasses.pendingApprovals', 'Pending Approvals')}
                {pendingApprovals.length > 0 && (
                  <Badge variant="secondary" className="ms-1 text-xs">
                    {pendingApprovals.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">
                {t('contractors.gatePasses.allPasses', 'All Passes')}
              </TabsTrigger>
            </TabsList>

            {/* Today's Passes Sub-Tab */}
            <TabsContent value="today" className="mt-4">
              <TodayGatePassesWrapper />
            </TabsContent>

            {/* Pending Approvals Sub-Tab */}
            <TabsContent value="pending" className="mt-4">
              <GatePassApprovalQueue passes={pendingApprovals} />
            </TabsContent>

            {/* All Passes Sub-Tab */}
            <TabsContent value="all" className="mt-4 space-y-4">
              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('contractors.gatePasses.searchPlaceholder', 'Search by reference, material, vehicle...')}
                    value={gatePassSearch}
                    onChange={(e) => setGatePassSearch(e.target.value)}
                    className="ps-9"
                  />
                </div>
                <Select value={gatePassStatus} onValueChange={setGatePassStatus}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 me-2" />
                    <SelectValue placeholder={t('common.status', 'Status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.allStatuses', 'All Statuses')}</SelectItem>
                    <SelectItem value="pending_pm_approval">{t('contractors.gatePasses.status.pendingPm', 'Pending PM')}</SelectItem>
                    <SelectItem value="pending_safety_approval">{t('contractors.gatePasses.status.pendingSafety', 'Pending Safety')}</SelectItem>
                    <SelectItem value="approved">{t('contractors.gatePasses.status.approved', 'Approved')}</SelectItem>
                    <SelectItem value="rejected">{t('contractors.gatePasses.status.rejected', 'Rejected')}</SelectItem>
                    <SelectItem value="completed">{t('contractors.gatePasses.status.completed', 'Completed')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={gatePassProject} onValueChange={setGatePassProject}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder={t('contractors.gatePasses.filterByProject', 'Filter by Project')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.allProjects', 'All Projects')}</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Gate Pass Table */}
              <GatePassListTable gatePasses={allGatePasses} isLoading={passesLoading} />
            </TabsContent>
          </Tabs>
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
