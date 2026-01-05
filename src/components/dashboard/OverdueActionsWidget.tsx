import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOverdueActions } from '@/hooks/use-overdue-actions';
import { cn } from '@/lib/utils';

function getPriorityVariant(priority: string | null): "destructive" | "secondary" | "outline" | "default" {
  switch (priority?.toLowerCase()) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
}

function getUrgencyClass(daysOverdue: number): string {
  if (daysOverdue > 7) return 'text-destructive';
  if (daysOverdue > 3) return 'text-orange-600 dark:text-orange-400';
  return 'text-yellow-600 dark:text-yellow-400';
}

export function OverdueActionsWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: overdueActions, isLoading } = useOverdueActions(5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const hasOverdueActions = overdueActions && overdueActions.length > 0;

  return (
    <Card className={cn(
      hasOverdueActions && "border-destructive/50 bg-destructive/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasOverdueActions ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-success" />
            )}
            <CardTitle className="text-lg">
              {t('dashboard.overdueActions', 'Overdue Actions')}
            </CardTitle>
          </div>
          {hasOverdueActions && (
            <Badge variant="destructive" className="text-xs">
              {overdueActions.length}
            </Badge>
          )}
        </div>
        <CardDescription>
          {hasOverdueActions 
            ? t('dashboard.criticalAttention', 'Needs Immediate Attention')
            : t('dashboard.noOverdueActions', 'No overdue actions')
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {hasOverdueActions ? (
          <>
            {overdueActions.map((action) => (
              <div 
                key={action.id}
                className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{action.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={getPriorityVariant(action.priority)} className="text-xs">
                      {action.priority || 'medium'}
                    </Badge>
                    {action.incident_reference && (
                      <span>{action.incident_reference}</span>
                    )}
                    {action.session_reference && (
                      <span>{action.session_reference}</span>
                    )}
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium whitespace-nowrap",
                  getUrgencyClass(action.days_overdue)
                )}>
                  <Clock className="h-3 w-3" />
                  {t('dashboard.daysOverdue', '{{days}} days', { days: action.days_overdue })}
                </div>
              </div>
            ))}
            
            <Button 
              variant="ghost" 
              className="w-full mt-2"
              onClick={() => navigate('/incidents/actions')}
            >
              {t('dashboard.viewAllActions', 'View All Actions')}
              <ArrowRight className="ms-2 h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-success mb-2" />
            <p className="text-sm">{t('dashboard.allActionsOnTrack', 'All actions are on track!')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
