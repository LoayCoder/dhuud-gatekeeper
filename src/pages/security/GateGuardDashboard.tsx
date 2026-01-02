import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Users, Truck, HardHat, AlertTriangle, Activity, Search, Filter, Package } from 'lucide-react';
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
import { ActiveWorkersList } from '@/components/security/ActiveWorkersList';
import { WorkerVerificationPanel } from '@/components/security/WorkerVerificationPanel';
import { TodayGatePassesWrapper } from '@/components/security/TodayGatePassesWrapper';
import { GateLogTable } from '@/components/security/GateLogTable';
import { GatePassListTable } from '@/components/contractors/GatePassListTable';
import { GatePassApprovalQueue } from '@/components/contractors/GatePassApprovalQueue';
import { MaterialPassVerificationPanel } from '@/components/security/MaterialPassVerificationPanel';
import { ZoneSelector } from '@/components/security/ZoneSelector';
import { useMaterialGatePasses, usePendingGatePassApprovals } from '@/hooks/contractor-management/use-material-gate-passes';
import { useContractorProjects } from '@/hooks/contractor-management/use-contractor-projects';
import { GateOfflineStatusBar } from '@/components/security/GateOfflineStatusBar';
import { cn } from '@/lib/utils';
import { GateScanProvider } from '@/contexts/GateScanContext';

const GateGuardDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('visitors');
  
  // Callback for switching tabs programmatically (used by verification panels)
  const handleSwitchTab = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);
  
  // Gate pass sub-tab state
  const [gatePassTab, setGatePassTab] = useState('today');
  const [gatePassSearch, setGatePassSearch] = useState('');
  const [gatePassStatus, setGatePassStatus] = useState('all');
  const [gatePassProject, setGatePassProject] = useState('all');
  
  // Zone state for zone-level access control
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  
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
      // Find the alert to determine its source table
      const alert = alerts.find(a => a.id === alertId);
      if (!alert || alertId === 'pending-passes') {
        refetchAlerts();
        return;
      }

      // Only geofence alerts can be acknowledged - blacklist alerts are informational
      if (alert.sourceTable === 'geofence_alerts') {
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

  // Track last sync time
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>(undefined);
  
  useEffect(() => {
    // Update last sync time when stats are fetched
    if (stats) {
      setLastSyncTime(new Date());
    }
  }, [stats]);

  return (
    <GateScanProvider>
    <div className="container mx-auto py-3 sm:py-4 px-3 sm:px-4 md:px-6 space-y-3 sm:space-y-4 min-w-0">
      {/* Offline Status Bar - Important for PWA users */}
      <GateOfflineStatusBar 
        lastSyncTime={lastSyncTime}
        onRefresh={handleRefresh}
      />
      
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            <span className="truncate">{t('security.gateDashboard.title', 'Gate Guard Dashboard')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('security.gateDashboard.description', 'Central control for gate operations')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Zone Selector for zone-level access control */}
          <ZoneSelector 
            onZoneChange={setSelectedZoneId}
            className="hidden sm:flex"
          />
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            className="gap-2 flex-shrink-0"
            size="sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.refresh', 'Refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Mobile Zone Selector */}
      <div className="sm:hidden">
        <ZoneSelector onZoneChange={setSelectedZoneId} />
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={cn('p-1.5 sm:p-2 rounded-lg flex-shrink-0', stat.bgColor)}>
                  <stat.icon className={cn('h-4 w-4 sm:h-5 sm:w-5', stat.color)} />
                </div>
                <div className="min-w-0">
                  {statsLoading ? (
                    <Skeleton className="h-6 sm:h-7 w-10 sm:w-12" />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                  )}
                  <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{stat.label}</p>
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
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <span className="truncate">{t('security.gateDashboard.activeAlerts', 'Active Alerts')}</span>
            <Badge variant="destructive" className="text-xs flex-shrink-0">
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
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-5 min-w-full sm:min-w-0">
            <TabsTrigger value="visitors" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 hidden xs:block sm:block" />
              {t('security.gateDashboard.tabs.visitors', 'Visitors')}
            </TabsTrigger>
            <TabsTrigger value="workers" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
              <HardHat className="h-3.5 w-3.5 sm:h-4 sm:w-4 hidden xs:block sm:block" />
              {t('security.gateDashboard.tabs.workers', 'Workers')}
            </TabsTrigger>
            <TabsTrigger value="material" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 hidden xs:block sm:block" />
              {t('security.gateDashboard.tabs.material', 'Material')}
            </TabsTrigger>
            <TabsTrigger value="gatePasses" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
              <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 hidden xs:block sm:block" />
              {t('security.gateDashboard.tabs.gatePasses', 'Gate Passes')}
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 hidden xs:block sm:block" />
              {t('security.gateDashboard.tabs.activityLog', 'Activity')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Visitors Tab */}
        <TabsContent value="visitors" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            <VisitorVerificationPanel onSwitchTab={handleSwitchTab} />
            <ActiveVisitorsList />
          </div>
        </TabsContent>

        {/* Workers Tab */}
        <TabsContent value="workers" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            <WorkerVerificationPanel onSwitchTab={handleSwitchTab} />
            <ActiveWorkersList />
          </div>
        </TabsContent>

        {/* Material Tab - NEW */}
        <TabsContent value="material" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            <MaterialPassVerificationPanel />
            <TodayGatePassesWrapper />
          </div>
        </TabsContent>

        {/* Gate Passes Tab */}
        <TabsContent value="gatePasses" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <Tabs value={gatePassTab} onValueChange={setGatePassTab}>
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
              <TabsList className="inline-flex w-max sm:w-auto sm:grid sm:grid-cols-3">
                <TabsTrigger value="today" className="whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                  {t('contractors.gatePasses.todayPasses', "Today's Passes")}
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-1 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                  <span className="hidden sm:inline">{t('contractors.gatePasses.pendingApprovals', 'Pending Approvals')}</span>
                  <span className="sm:hidden">{t('contractors.gatePasses.pending', 'Pending')}</span>
                  {pendingApprovals.length > 0 && (
                    <Badge variant="secondary" className="ms-1 text-[10px] sm:text-xs h-4 sm:h-5 px-1 sm:px-1.5">
                      {pendingApprovals.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" className="whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                  {t('contractors.gatePasses.allPasses', 'All Passes')}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Today's Passes Sub-Tab */}
            <TabsContent value="today" className="mt-3 sm:mt-4">
              <TodayGatePassesWrapper />
            </TabsContent>

            {/* Pending Approvals Sub-Tab */}
            <TabsContent value="pending" className="mt-3 sm:mt-4">
              <GatePassApprovalQueue passes={pendingApprovals} />
            </TabsContent>

            {/* All Passes Sub-Tab */}
            <TabsContent value="all" className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('contractors.gatePasses.searchPlaceholder', 'Search by reference, material, vehicle...')}
                    value={gatePassSearch}
                    onChange={(e) => setGatePassSearch(e.target.value)}
                    className="ps-9 text-sm"
                  />
                </div>
                <Select value={gatePassStatus} onValueChange={setGatePassStatus}>
                  <SelectTrigger className="w-full text-sm">
                    <Filter className="h-4 w-4 me-2 flex-shrink-0" />
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
                  <SelectTrigger className="w-full text-sm">
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
        <TabsContent value="activity" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          {stats && (
            <GateActivityCharts
              hourlyTrend={stats.hourlyTrend}
              entryTypeBreakdown={stats.entryTypeBreakdown}
            />
          )}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <GateLogTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </GateScanProvider>
  );
};

export default GateGuardDashboard;
