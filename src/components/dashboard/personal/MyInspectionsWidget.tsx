import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, AlertTriangle, Clock, CheckCircle2, ArrowRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePersonalDashboard, useMyPendingInspections, useMyUpcomingScheduledInspections } from '@/hooks/use-personal-dashboard';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation as useI18n } from 'react-i18next';

export function MyInspectionsWidget() {
  const { t } = useTranslation();
  const { i18n } = useI18n();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = usePersonalDashboard();
  const { data: pendingInspections, isLoading: pendingLoading } = useMyPendingInspections();
  const { data: upcomingSchedules, isLoading: schedulesLoading } = useMyUpcomingScheduledInspections();

  const isLoading = statsLoading || pendingLoading || schedulesLoading;
  const locale = i18n.language === 'ar' ? ar : enUS;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const inspectionStats = stats.inspections;
  const hasOverdue = inspectionStats.overdue > 0;
  const hasDueToday = inspectionStats.due_today > 0;
  const hasPending = inspectionStats.assigned_pending > 0;

  // Combine pending inspections and upcoming schedules for display
  const displayInspections = (pendingInspections || []).slice(0, 2);
  const displaySchedules = (upcomingSchedules || []).slice(0, 2);

  return (
    <Card className={cn(hasOverdue && 'border-destructive/50')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasOverdue ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            )}
            <CardTitle className="text-lg">
              {t('dashboard.personal.myInspections', 'My Inspections')}
            </CardTitle>
          </div>
          {hasPending && (
            <Badge variant={hasOverdue ? 'destructive' : 'secondary'}>
              {inspectionStats.assigned_pending}
            </Badge>
          )}
        </div>
        <CardDescription>
          {hasOverdue
            ? t('dashboard.personal.inspectionsOverdue', 'You have overdue inspections')
            : hasPending
            ? t('dashboard.personal.inspectionsAssigned', 'Inspections assigned to you')
            : t('dashboard.personal.noInspections', 'No pending inspections')
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className={cn(
            'rounded-lg border p-2',
            hasOverdue && 'border-destructive/50 bg-destructive/10'
          )}>
            <p className={cn('text-lg font-bold tabular-nums', hasOverdue && 'text-destructive')}>
              {inspectionStats.overdue}
            </p>
            <p className="text-xs text-muted-foreground">{t('dashboard.personal.overdue', 'Overdue')}</p>
          </div>
          <div className={cn(
            'rounded-lg border p-2',
            hasDueToday && 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30'
          )}>
            <p className="text-lg font-bold tabular-nums">{inspectionStats.due_today}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.personal.dueToday', 'Due Today')}</p>
          </div>
          <div className="rounded-lg border p-2 border-success/50 bg-success/10">
            <p className="text-lg font-bold tabular-nums text-success">{inspectionStats.completed_this_week}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.personal.thisWeek', 'This Week')}</p>
          </div>
        </div>

        {/* Active Inspections */}
        {displayInspections.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('dashboard.personal.activeInspections', 'Active Inspections')}</p>
            {displayInspections.map((inspection) => (
              <div 
                key={inspection.id}
                className="flex items-center justify-between rounded-lg border bg-background p-2 text-sm cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/inspections/session/${inspection.id}`)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {i18n.language === 'ar' ? inspection.template?.name_ar : inspection.template?.name}
                    </p>
                    {inspection.site && (
                      <p className="truncate text-xs text-muted-foreground">{inspection.site.name}</p>
                    )}
                  </div>
                </div>
                <Badge variant={inspection.status === 'in_progress' ? 'default' : 'outline'} className="text-xs shrink-0">
                  {inspection.status === 'in_progress' ? t('common.inProgress', 'In Progress') : t('common.draft', 'Draft')}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Schedules */}
        {displaySchedules.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('dashboard.personal.upcomingSchedules', 'Upcoming')}</p>
            {displaySchedules.map((schedule) => (
              <div 
                key={schedule.id}
                className="flex items-center justify-between rounded-lg border bg-background p-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {i18n.language === 'ar' ? schedule.template?.name_ar : schedule.template?.name}
                    </p>
                  <p className="text-xs text-muted-foreground">
                      {schedule.next_due && format(new Date(schedule.next_due), 'PP', { locale })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {displayInspections.length === 0 && displaySchedules.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-success mb-2" />
            <p className="text-sm">{t('dashboard.personal.allInspectionsComplete', 'All inspections complete!')}</p>
          </div>
        )}
        
        <Button 
          variant="ghost" 
          className="w-full"
          onClick={() => navigate('/inspections')}
        >
          {t('dashboard.personal.viewAllInspections', 'View All Inspections')}
          <ArrowRight className="ms-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
