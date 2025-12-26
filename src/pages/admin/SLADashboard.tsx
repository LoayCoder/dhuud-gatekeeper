import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSLADashboard } from '@/hooks/use-sla-dashboard';
import { useActionSLAConfig } from '@/hooks/use-action-sla-config';
import { SLAStatusCards } from '@/components/sla/SLAStatusCards';
import { SLACountdownTimer } from '@/components/sla/SLACountdownTimer';
import { SLADonutChart } from '@/components/sla/SLACharts';
import { SLABulkActionsPanel } from '@/components/sla/SLABulkActionsPanel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Activity, Filter, Download, Settings, Search, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { exportToCSV } from '@/lib/export-utils';

const getPriorityVariant = (priority: string | null) => {
  switch (priority) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    case 'low': return 'outline';
    default: return 'outline';
  }
};

export default function SLADashboard() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();
  const { actions, stats, isLoading, refetch } = useSLADashboard();
  const { slaConfigs } = useActionSLAConfig();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Get warning threshold from config based on priority
  const getWarningDays = (priority: string | null) => {
    const config = slaConfigs.find(c => c.priority === (priority || 'medium'));
    return config?.warning_days_before || 3;
  };

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'escalated' && action.escalation_level === 0) return false;
        if (filterStatus === 'overdue') {
          const now = Date.now();
          const due = action.due_date ? new Date(action.due_date).getTime() : null;
          if (!due || due > now || action.escalation_level > 0) return false;
        }
        if (filterStatus === 'warning') {
          const now = Date.now();
          const due = action.due_date ? new Date(action.due_date).getTime() : null;
          if (!due) return false;
          const daysUntilDue = (due - now) / (1000 * 60 * 60 * 24);
          const warningDays = getWarningDays(action.priority);
          if (daysUntilDue < 0 || daysUntilDue > warningDays) return false;
        }
        if (filterStatus === 'ontrack') {
          const now = Date.now();
          const due = action.due_date ? new Date(action.due_date).getTime() : null;
          if (!due) return true;
          const daysUntilDue = (due - now) / (1000 * 60 * 60 * 24);
          const warningDays = getWarningDays(action.priority);
          if (daysUntilDue <= warningDays || action.escalation_level > 0) return false;
        }
      }
      // Priority filter
      if (filterPriority !== 'all' && action.priority !== filterPriority) return false;
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = action.title?.toLowerCase().includes(query);
        const matchesRef = action.reference_id?.toLowerCase().includes(query);
        const matchesAssignee = action.assignee_name?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesRef && !matchesAssignee) return false;
      }
      return true;
    });
  }, [actions, filterStatus, filterPriority, searchQuery, slaConfigs]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredActions.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredActions.filter(a => selectedIds.includes(a.id))
      : filteredActions;

    // Convert to plain objects for export
    const exportData = dataToExport.map(action => ({
      reference_id: action.reference_id || '',
      title: action.title,
      priority: action.priority || 'medium',
      assignee_name: action.assignee_name || '',
      due_date: action.due_date ? format(new Date(action.due_date), 'yyyy-MM-dd') : '',
      status: action.status || 'pending',
      escalation_level: action.escalation_level,
    }));

    exportToCSV(exportData, 'sla-actions-export', [
      { key: 'reference_id', label: t('actions.referenceId', 'Reference ID') },
      { key: 'title', label: t('actions.title', 'Title') },
      { key: 'priority', label: t('actions.priority', 'Priority') },
      { key: 'assignee_name', label: t('actions.assignee', 'Assignee') },
      { key: 'due_date', label: t('actions.dueDate', 'Due Date') },
      { key: 'status', label: t('actions.status', 'Status') },
      { key: 'escalation_level', label: t('sla.escalationLevel', 'Escalation Level') },
    ]);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6" dir={direction}>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" dir={direction}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            {t('sla.dashboard', 'SLA Dashboard')}
          </h1>
          <p className="text-muted-foreground">
            {t('sla.dashboardDescription', 'Real-time overview of corrective action SLA status')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/action-sla')} className="gap-2">
            <Settings className="h-4 w-4" />
            {t('sla.settings', 'Settings')}
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            {t('common.export', 'Export')}
          </Button>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Status Cards + Chart */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <SLAStatusCards stats={stats} />
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('sla.distribution', 'Distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <SLADonutChart stats={stats} />
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      <SLABulkActionsPanel
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        onExport={handleExport}
      />

      {/* Actions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>{t('sla.activeActions', 'Active Actions')}</CardTitle>
              <CardDescription>
                {t('sla.totalActions', '{{count}} actions requiring attention', { count: stats.total })}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('common.search', 'Search...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9 w-[180px]"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus} dir={direction}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 me-2" />
                  <SelectValue placeholder={t('sla.filterStatus', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                  <SelectItem value="ontrack">{t('sla.onTrack', 'On Track')}</SelectItem>
                  <SelectItem value="warning">{t('sla.dueSoon', 'Due Soon')}</SelectItem>
                  <SelectItem value="overdue">{t('sla.overdue', 'Overdue')}</SelectItem>
                  <SelectItem value="escalated">{t('sla.escalated', 'Escalated')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority} dir={direction}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('sla.filterPriority', 'Priority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                  <SelectItem value="critical">{t('priority.critical', 'Critical')}</SelectItem>
                  <SelectItem value="high">{t('priority.high', 'High')}</SelectItem>
                  <SelectItem value="medium">{t('priority.medium', 'Medium')}</SelectItem>
                  <SelectItem value="low">{t('priority.low', 'Low')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.length === filteredActions.length && filteredActions.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>{t('sla.countdown', 'Countdown')}</TableHead>
                  <TableHead>{t('actions.title', 'Title')}</TableHead>
                  <TableHead>{t('actions.priority', 'Priority')}</TableHead>
                  <TableHead>{t('actions.assignee', 'Assignee')}</TableHead>
                  <TableHead>{t('actions.dueDate', 'Due Date')}</TableHead>
                  <TableHead>{t('actions.status', 'Status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('sla.noActions', 'No actions matching filters')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(action.id)}
                          onCheckedChange={(checked) => handleSelectOne(action.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <SLACountdownTimer
                          dueDate={action.due_date}
                          escalationLevel={action.escalation_level}
                          status={action.status}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-[250px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          {action.reference_id && (
                            <Badge variant="outline" className="font-mono text-xs shrink-0">
                              {action.reference_id}
                            </Badge>
                          )}
                          <span className="truncate">{action.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityVariant(action.priority) as any}>
                          {action.priority || 'medium'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {action.assignee_name || (
                          <span className="text-muted-foreground italic">
                            {t('actions.unassigned', 'Unassigned')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {action.due_date ? format(new Date(action.due_date), 'PP') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{action.status || 'pending'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
