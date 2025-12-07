import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSLADashboard } from '@/hooks/use-sla-dashboard';
import { SLAStatusCards } from '@/components/sla/SLAStatusCards';
import { SLACountdownTimer } from '@/components/sla/SLACountdownTimer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Activity, Filter } from 'lucide-react';
import { format } from 'date-fns';

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
  const { actions, stats, isLoading, refetch } = useSLADashboard();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const filteredActions = actions.filter((action) => {
    if (filterStatus !== 'all') {
      if (filterStatus === 'escalated' && action.escalation_level === 0) return false;
      if (filterStatus === 'overdue') {
        const now = Date.now();
        const due = action.due_date ? new Date(action.due_date).getTime() : null;
        if (!due || due > now) return false;
      }
      if (filterStatus === 'warning') {
        const now = Date.now();
        const due = action.due_date ? new Date(action.due_date).getTime() : null;
        if (!due) return false;
        const daysUntilDue = (due - now) / (1000 * 60 * 60 * 24);
        if (daysUntilDue < 0 || daysUntilDue > 3) return false;
      }
    }
    if (filterPriority !== 'all' && action.priority !== filterPriority) return false;
    return true;
  });

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
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Status Cards */}
      <SLAStatusCards stats={stats} />

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
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus} dir={direction}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 me-2" />
                  <SelectValue placeholder={t('sla.filterStatus', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('sla.noActions', 'No actions matching filters')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell>
                        <SLACountdownTimer
                          dueDate={action.due_date}
                          escalationLevel={action.escalation_level}
                          status={action.status}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {action.title}
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
