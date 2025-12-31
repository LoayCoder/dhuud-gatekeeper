import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowLeft, ClipboardList, RefreshCw } from 'lucide-react';
import { useDeptRepDashboard } from '@/hooks/use-dept-rep-dashboard';
import { useDeptRepEvents } from '@/hooks/use-dept-rep-events';
import { useUserRoles } from '@/hooks/use-user-roles';
import { DeptRepStatsCards } from '@/components/dept-rep/DeptRepStatsCards';
import { DeptRepEventsTable } from '@/components/dept-rep/DeptRepEventsTable';
import { useQueryClient } from '@tanstack/react-query';

type TabValue = 'all' | 'pending' | 'in_progress' | 'overdue' | 'completed';

export default function DeptRepDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole, isLoading: rolesLoading } = useUserRoles();
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stats, isLoading: statsLoading } = useDeptRepDashboard();
  const { data: events, isLoading: eventsLoading, refetch } = useDeptRepEvents({
    status: activeTab,
    search: searchQuery,
  });

  const isDeptRep = hasRole('department_representative');

  // Redirect if not department representative
  if (!rolesLoading && !isDeptRep) {
    navigate('/');
    return null;
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dept-rep-dashboard-stats'] });
    refetch();
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              {t('deptRepDashboard.title', 'My Department Reports')}
            </h1>
            {stats?.has_department && (
              <Badge variant="outline" className="mt-1">
                {t('deptRepDashboard.myDepartment', 'My Department')}
              </Badge>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="shrink-0">
          <RefreshCw className="h-4 w-4 me-2" />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Stats Cards */}
      <DeptRepStatsCards stats={stats} isLoading={statsLoading} />

      {/* Events Card with Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">
              {t('deptRepDashboard.eventReports', 'Event Reports')}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('deptRepDashboard.search', 'Search by reference or title...')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                {t('deptRepDashboard.tabs.all', 'All')}
                <Badge variant="secondary" className="ms-2">
                  {stats?.total_count ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending">
                {t('deptRepDashboard.tabs.pending', 'Pending')}
                <Badge variant="secondary" className="ms-2 bg-blue-500/20 text-blue-700 dark:text-blue-400">
                  {stats?.new_count ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                {t('deptRepDashboard.tabs.inProgress', 'In Progress')}
                <Badge variant="secondary" className="ms-2 bg-amber-500/20 text-amber-700 dark:text-amber-400">
                  {stats?.in_progress_count ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="overdue">
                {t('deptRepDashboard.tabs.overdue', 'Overdue')}
                <Badge variant="secondary" className="ms-2 bg-red-500/20 text-red-700 dark:text-red-400">
                  {stats?.overdue_count ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed">
                {t('deptRepDashboard.tabs.completed', 'Completed')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              <DeptRepEventsTable events={events || []} isLoading={eventsLoading} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
