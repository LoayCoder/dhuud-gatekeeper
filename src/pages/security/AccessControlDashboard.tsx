import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { startOfDay, startOfWeek, subDays } from 'date-fns';
import { 
  Shield, Users, HardHat, Clock, CheckCircle2, AlertTriangle, 
  QrCode, ClipboardCheck, History, RefreshCw, UserPlus, Package,
  LayoutDashboard
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { useUnifiedAccessStats, useUnifiedAccessLogs, useRecordUnifiedExit, type EntityType } from '@/hooks/use-unified-access';
import { usePendingSecurityRequests } from '@/hooks/use-visit-requests';
import { usePendingWorkerApprovals } from '@/hooks/contractor-management/use-contractor-workers';
import { usePendingGatePassApprovals } from '@/hooks/contractor-management/use-material-gate-passes';

import { UniversalQRScanner, type ScanResult } from '@/components/security/UniversalQRScanner';
import { UnifiedAccessLogTable } from '@/components/security/UnifiedAccessLogTable';
import { VisitorApprovalQueue } from '@/components/security/VisitorApprovalQueue';
import { WorkerApprovalQueue } from '@/components/contractors/WorkerApprovalQueue';
import { GatePassApprovalQueue } from '@/components/contractors/GatePassApprovalQueue';

export default function AccessControlDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [entityFilter, setEntityFilter] = useState<EntityType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days'>('today');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useUnifiedAccessStats();
  
  // Pending approvals
  const { data: pendingVisitorApprovals = [] } = usePendingSecurityRequests();
  const { data: pendingWorkerApprovals = [] } = usePendingWorkerApprovals();
  const { data: pendingGatePassApprovals = [] } = usePendingGatePassApprovals();

  // Calculate date range based on filter
  const getDateFrom = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return startOfDay(now).toISOString();
      case '7days':
        return startOfWeek(subDays(now, 7)).toISOString();
      case '30days':
        return subDays(now, 30).toISOString();
      default:
        return startOfDay(now).toISOString();
    }
  };

  // Access logs
  const { data: accessLogs = [], isLoading: logsLoading } = useUnifiedAccessLogs({
    entityType: entityFilter,
    dateFrom: getDateFrom(),
    search: searchQuery || undefined,
  });

  // On-site entries only
  const { data: onSiteEntries = [], isLoading: onSiteLoading } = useUnifiedAccessLogs({
    onlyActive: true,
    dateFrom: startOfDay(new Date()).toISOString(),
  });

  const recordExit = useRecordUnifiedExit();

  const handleScanResult = (result: ScanResult) => {
    setScannerOpen(false);
    // Navigate to appropriate verification based on entity type
    // For now, just log and handle in a toast or redirect
    console.log('Scanned:', result);
    // Could redirect to gate dashboard with pre-filled data
    if (result.entityType === 'worker') {
      window.location.href = `/security/gate-dashboard?tab=workers&token=${result.token}`;
    } else if (result.entityType === 'visitor') {
      window.location.href = `/security/gate-dashboard?tab=visitors&token=${result.token}`;
    } else {
      window.location.href = `/security/gate-dashboard?tab=material&token=${result.token}`;
    }
  };

  const handleRecordExit = (entryId: string, source?: 'gate_entry_logs' | 'contractor_access_logs') => {
    recordExit.mutate({ entryId, source });
  };

  const totalPendingApprovals = pendingVisitorApprovals.length + pendingWorkerApprovals.length + pendingGatePassApprovals.length;

  const statCards = [
    {
      label: t('security.accessControl.totalOnSite', 'Total On Site'),
      value: stats?.totalOnSite ?? 0,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: t('security.accessControl.visitorsOnSite', 'Visitors'),
      value: stats?.visitorsOnSite ?? 0,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: t('security.accessControl.workersOnSite', 'Workers'),
      value: stats?.workersOnSite ?? 0,
      icon: HardHat,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: t('security.accessControl.pendingApprovals', 'Pending Approvals'),
      value: totalPendingApprovals,
      icon: Clock,
      color: totalPendingApprovals > 0 ? 'text-destructive' : 'text-muted-foreground',
      bgColor: totalPendingApprovals > 0 ? 'bg-destructive/10' : 'bg-muted/50',
    },
  ];

  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary flex-shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {t('security.accessControl.title', 'Access Control')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('security.accessControl.description', 'Unified visitor and worker access management')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setScannerOpen(true)} className="gap-2">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">{t('security.accessControl.scanQR', 'Scan QR')}</span>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link to="/security/gate-dashboard">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">{t('security.accessControl.gateDashboard', 'Gate Operations')}</span>
            </Link>
          </Button>
          <Button onClick={() => refetchStats()} variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={cn('p-2 rounded-lg flex-shrink-0', stat.bgColor)}>
                  <stat.icon className={cn('h-4 w-4 sm:h-5 sm:w-5', stat.color)} />
                </div>
                <div className="min-w-0">
                  {statsLoading ? (
                    <Skeleton className="h-6 w-12" />
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

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-5">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('security.accessControl.tabs.onSite', 'On Site')}
              {(stats?.totalOnSite ?? 0) > 0 && (
                <Badge variant="secondary" className="ms-1 text-xs">{stats?.totalOnSite}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
              <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('security.accessControl.tabs.approvals', 'Approvals')}
              {totalPendingApprovals > 0 && (
                <Badge variant="destructive" className="ms-1 text-xs">{totalPendingApprovals}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="visitors" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('security.accessControl.tabs.visitors', 'Visitors')}
            </TabsTrigger>
            <TabsTrigger value="workers" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
              <HardHat className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('security.accessControl.tabs.workers', 'Workers')}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('security.accessControl.tabs.history', 'History')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* On Site Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    {t('security.accessControl.currentlyOnSite', 'Currently On Site')}
                    <Badge variant="secondary">{onSiteEntries.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {t('security.accessControl.onSiteDescription', 'All visitors and workers currently checked in')}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/visitors/register" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    {t('security.accessControl.preRegister', 'Pre-Register')}
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <UnifiedAccessLogTable
                entries={onSiteEntries}
                isLoading={onSiteLoading}
                onRecordExit={handleRecordExit}
                showExitButton={true}
                compact={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Visitor Approvals */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                  {t('security.accessControl.visitorApprovals', 'Visitor Approvals')}
                  {pendingVisitorApprovals.length > 0 && (
                    <Badge variant="destructive">{pendingVisitorApprovals.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VisitorApprovalQueue />
              </CardContent>
            </Card>

            {/* Worker Approvals */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HardHat className="h-5 w-5 text-amber-600" />
                  {t('security.accessControl.workerApprovals', 'Worker Approvals')}
                  {pendingWorkerApprovals.length > 0 && (
                    <Badge variant="destructive">{pendingWorkerApprovals.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WorkerApprovalQueue workers={pendingWorkerApprovals} />
              </CardContent>
            </Card>
          </div>

          {/* Gate Pass Approvals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-green-600" />
                {t('security.accessControl.gatePassApprovals', 'Gate Pass Approvals')}
                {pendingGatePassApprovals.length > 0 && (
                  <Badge variant="destructive">{pendingGatePassApprovals.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GatePassApprovalQueue passes={pendingGatePassApprovals} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visitors Tab */}
        <TabsContent value="visitors" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                {t('security.accessControl.visitorAccess', 'Visitor Access')}
              </CardTitle>
              <CardDescription>
                {t('security.accessControl.visitorAccessDescription', 'Recent visitor entries and exits')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedAccessLogTable
                entries={accessLogs.filter(e => e.entity_type === 'visitor')}
                isLoading={logsLoading}
                onRecordExit={handleRecordExit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workers Tab */}
        <TabsContent value="workers" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-amber-600" />
                {t('security.accessControl.workerAccess', 'Worker Access')}
              </CardTitle>
              <CardDescription>
                {t('security.accessControl.workerAccessDescription', 'Recent contractor worker entries and exits')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedAccessLogTable
                entries={accessLogs.filter(e => e.entity_type === 'worker' || e.entity_type === 'contractor')}
                isLoading={logsLoading}
                onRecordExit={handleRecordExit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    {t('security.accessControl.accessHistory', 'Access History')}
                  </CardTitle>
                  <CardDescription>
                    {t('security.accessControl.accessHistoryDescription', 'Complete log of all entries and exits')}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder={t('common.search', 'Search...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-48"
                  />
                  <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v as EntityType | 'all')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                      <SelectItem value="visitor">{t('security.accessControl.entityTypes.visitor', 'Visitors')}</SelectItem>
                      <SelectItem value="worker">{t('security.accessControl.entityTypes.worker', 'Workers')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as 'today' | '7days' | '30days')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">{t('common.today', 'Today')}</SelectItem>
                      <SelectItem value="7days">{t('common.last7Days', 'Last 7 Days')}</SelectItem>
                      <SelectItem value="30days">{t('common.last30Days', 'Last 30 Days')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UnifiedAccessLogTable
                entries={accessLogs}
                isLoading={logsLoading}
                onRecordExit={handleRecordExit}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Scanner */}
      <UniversalQRScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScanResult}
      />
    </div>
  );
}
