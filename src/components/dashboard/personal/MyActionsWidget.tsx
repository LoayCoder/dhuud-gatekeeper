import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePersonalDashboard } from '@/hooks/use-personal-dashboard';
import { cn } from '@/lib/utils';

export function MyActionsWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: stats, isLoading } = usePersonalDashboard();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const actionStats = stats.actions;
  const hasOverdue = actionStats.overdue > 0;
  const hasReturned = actionStats.returned > 0;

  const statItems = [
    {
      key: 'overdue',
      label: t('dashboard.personal.overdueActions', 'Overdue'),
      value: actionStats.overdue,
      icon: AlertTriangle,
      variant: 'destructive' as const,
      show: true,
    },
    {
      key: 'returned',
      label: t('dashboard.personal.returnedActions', 'Returned for Revision'),
      value: actionStats.returned,
      icon: RotateCcw,
      variant: 'secondary' as const,
      show: actionStats.returned > 0,
    },
    {
      key: 'pending',
      label: t('dashboard.personal.pendingStart', 'Pending Start'),
      value: actionStats.pending,
      icon: Clock,
      variant: 'outline' as const,
      show: true,
    },
    {
      key: 'in_progress',
      label: t('dashboard.personal.inProgress', 'In Progress'),
      value: actionStats.in_progress,
      icon: Clock,
      variant: 'outline' as const,
      show: true,
    },
    {
      key: 'due_this_week',
      label: t('dashboard.personal.dueThisWeek', 'Due This Week'),
      value: actionStats.due_this_week,
      icon: Clock,
      variant: 'outline' as const,
      show: actionStats.due_this_week > 0,
    },
  ].filter(item => item.show);

  const totalActions = actionStats.pending + actionStats.in_progress + actionStats.overdue;

  return (
    <Card className={cn(hasOverdue && 'border-destructive/50')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasOverdue || hasReturned ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : totalActions > 0 ? (
              <Clock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-success" />
            )}
            <CardTitle className="text-lg">
              {t('dashboard.personal.myActions', 'My Assigned Actions')}
            </CardTitle>
          </div>
          {totalActions > 0 && (
            <Badge variant={hasOverdue ? 'destructive' : 'secondary'}>
              {totalActions}
            </Badge>
          )}
        </div>
        <CardDescription>
          {hasOverdue
            ? t('dashboard.personal.actionsNeedAttention', 'You have actions requiring immediate attention')
            : totalActions > 0
            ? t('dashboard.personal.actionsAssigned', 'Actions assigned to you')
            : t('dashboard.personal.noActions', 'No pending actions')
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {statItems.map((item) => (
          <div 
            key={item.key}
            className="flex items-center justify-between rounded-lg border bg-background p-3"
          >
            <div className="flex items-center gap-2">
              <item.icon className={cn(
                'h-4 w-4',
                item.key === 'overdue' && 'text-destructive',
                item.key === 'returned' && 'text-orange-500'
              )} />
              <span className="text-sm">{item.label}</span>
            </div>
            <Badge variant={item.variant}>
              {item.value}
            </Badge>
          </div>
        ))}

        {totalActions === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-success mb-2" />
            <p className="text-sm">{t('dashboard.personal.allActionsComplete', 'All caught up!')}</p>
          </div>
        )}
        
        <Button 
          variant="ghost" 
          className="w-full mt-2"
          onClick={() => navigate('/incidents/my-actions')}
        >
          {t('dashboard.personal.viewMyActions', 'View My Actions')}
          <ArrowRight className="ms-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
