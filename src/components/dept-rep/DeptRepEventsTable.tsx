import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, AlertTriangle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { DeptRepEvent } from '@/hooks/use-dept-rep-events';

interface DeptRepEventsTableProps {
  events: DeptRepEvent[];
  isLoading: boolean;
}

export function DeptRepEventsTable({ events, isLoading }: DeptRepEventsTableProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.dir() === 'rtl';
  const dateLocale = isRtl ? ar : enUS;

  const getSlaStatusBadge = (slaStatus: string, daysOverdue: number) => {
    switch (slaStatus) {
      case 'overdue':
        return (
          <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-3 w-3 me-1" />
            {t('deptRepDashboard.sla.overdue', 'Overdue')} ({daysOverdue}d)
          </Badge>
        );
      case 'at_risk':
        return (
          <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-3 w-3 me-1" />
            {t('deptRepDashboard.sla.atRisk', 'At Risk')}
          </Badge>
        );
      case 'on_track':
        return (
          <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400">
            <Clock className="h-3 w-3 me-1" />
            {t('deptRepDashboard.sla.onTrack', 'On Track')}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 me-1" />
            {t('deptRepDashboard.sla.completed', 'Completed')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-muted-foreground/50 bg-muted/50">
            {t('deptRepDashboard.sla.pending', 'Pending')}
          </Badge>
        );
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      critical: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
      high: 'border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400',
      medium: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400',
      low: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400',
    };
    return (
      <Badge variant="outline" className={variants[severity] || variants.low}>
        {t(`incident.severity.${severity}`, severity)}
      </Badge>
    );
  };

  const handleViewEvent = (eventId: string) => {
    navigate(`/incidents/investigate?id=${eventId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          {t('deptRepDashboard.noEvents', 'No events found for this filter')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-start">{t('deptRepDashboard.table.reference', 'Reference')}</TableHead>
            <TableHead className="text-start">{t('deptRepDashboard.table.title', 'Title')}</TableHead>
            <TableHead className="text-start">{t('deptRepDashboard.table.type', 'Type')}</TableHead>
            <TableHead className="text-start">{t('deptRepDashboard.table.severity', 'Severity')}</TableHead>
            <TableHead className="text-start">{t('deptRepDashboard.table.reporter', 'Reporter')}</TableHead>
            <TableHead className="text-start">{t('deptRepDashboard.table.reported', 'Reported')}</TableHead>
            <TableHead className="text-start">{t('deptRepDashboard.table.actions', 'Actions')}</TableHead>
            <TableHead className="text-start">{t('deptRepDashboard.table.slaStatus', 'SLA Status')}</TableHead>
            <TableHead className="text-end"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow 
              key={event.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleViewEvent(event.id)}
            >
              <TableCell className="font-mono text-sm">{event.reference_id}</TableCell>
              <TableCell className="max-w-[200px] truncate">{event.title}</TableCell>
              <TableCell>{t(`incident.type.${event.event_type}`, event.event_type)}</TableCell>
              <TableCell>{getSeverityBadge(event.severity)}</TableCell>
              <TableCell>{event.reporter_name}</TableCell>
              <TableCell>
                {format(new Date(event.reported_at), 'PP', { locale: dateLocale })}
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {event.completed_actions}/{event.total_actions}
                </span>
              </TableCell>
              <TableCell>{getSlaStatusBadge(event.sla_status, event.days_overdue)}</TableCell>
              <TableCell className="text-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewEvent(event.id);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
