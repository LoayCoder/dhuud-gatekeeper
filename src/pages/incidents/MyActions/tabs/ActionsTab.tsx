import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayCircle, CheckCircle2, CalendarPlus, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusIcon, getPriorityBadgeVariant } from '../helpers';
import { Link } from 'react-router-dom';
import type { MyActionsViewProps } from '../types';

export function ActionsTab({ viewProps }: { viewProps: MyActionsViewProps }) {
  const { t, i18n } = useTranslation();
  const {
    isLoading, displayedActiveActions, displayedClosedActions,
    handleStartWork, handleMarkCompleted, submittingActionIds,
    getDaysInfo, showClosedActions, setShowClosedActions,
    setExtensionRequestAction,
  } = viewProps;

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  if (!displayedActiveActions?.length && !displayedClosedActions?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-lg">{t('investigation.noActionsAssigned', 'No Actions Assigned')}</h3>
          <p className="text-muted-foreground text-sm">{t('investigation.noActionsDescription', 'You have no pending corrective actions.')}</p>
        </CardContent>
      </Card>
    );
  }

  const renderAction = (action: any) => {
    const daysInfo = getDaysInfo(action.due_date);
    const isSubmitting = submittingActionIds?.has(action.id);
    const canStart = action.status === 'assigned' || action.status === 'pending' || action.status === 'returned_for_correction';
    const canComplete = action.status === 'in_progress';
    const isClosed = action.status === 'closed' || action.status === 'verified';

    return (
      <Card key={action.id} className={cn('transition-all', daysInfo?.isOverdue && !isClosed ? 'border-destructive/50' : '')}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusIcon(action.status)}
                <span className="font-medium truncate">{action.title}</span>
                {action.priority && (
                  <Badge variant={getPriorityBadgeVariant(action.priority)} className="text-xs">
                    {String(t(`investigation.priority.${action.priority}`, action.priority))}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {String(t(`investigation.source.${action.source}`, action.source))}
                </Badge>
              </div>
              {action.reference_id && (
                <p className="text-xs text-muted-foreground">{action.reference_id}</p>
              )}
              {action.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{action.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {t(`investigation.actionStatus.${action.status}`, action.status)}
                </Badge>
                {action.due_date && (
                  <span className={cn('flex items-center gap-1', daysInfo?.isOverdue ? 'text-destructive font-medium' : daysInfo?.isDueSoon ? 'text-warning' : '')}>
                    <Clock className="h-3 w-3" />
                    {t('investigation.dueDate', 'Due Date')}: {new Date(action.due_date).toLocaleDateString(i18n.language)}
                    {daysInfo?.isOverdue && (
                      <span className="flex items-center gap-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        {daysInfo.days}d
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
            {!isClosed && (
              <div className="flex items-center gap-2 shrink-0">
                {canStart && (
                  <Button size="sm" onClick={() => handleStartWork(action)} disabled={isSubmitting}>
                    <PlayCircle className="h-4 w-4 me-1" />
                    {t('investigation.actions.startWork', 'Start Work')}
                  </Button>
                )}
                {canComplete && (
                  <Button size="sm" variant="default" onClick={() => handleMarkCompleted(action)} disabled={isSubmitting}>
                    <CheckCircle2 className="h-4 w-4 me-1" />
                    {t('investigation.actions.markCompleted', 'Mark Completed')}
                  </Button>
                )}
                {(canStart || canComplete) && action.due_date && (
                  <Button size="sm" variant="outline" onClick={() => setExtensionRequestAction(action)}>
                    <CalendarPlus className="h-4 w-4" />
                  </Button>
                )}
                {action.incident_id && (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/incidents/${action.incident_id}`}>{t('investigation.viewIncident', 'View Incident')}</Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Active Actions */}
      {displayedActiveActions?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase">
            {t('investigation.activeActions', 'Active Actions')} ({displayedActiveActions.length})
          </h3>
          {displayedActiveActions.map(renderAction)}
        </div>
      )}

      {/* Closed Actions Toggle */}
      {displayedClosedActions?.length > 0 && (
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClosedActions(!showClosedActions)}
            className="gap-1"
          >
            {showClosedActions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {t('investigation.closedActions', 'Closed Actions')} ({displayedClosedActions.length})
          </Button>
          {showClosedActions && displayedClosedActions.map(renderAction)}
        </div>
      )}
    </div>
  );
}
