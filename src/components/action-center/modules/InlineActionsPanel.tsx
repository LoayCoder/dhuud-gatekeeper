import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Timer,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useMyCorrectiveActions, useUpdateMyActionStatus } from '@/features/incidents';
import { ExtensionRequestDialog } from '@/features/incidents/components/actions/ExtensionRequestDialog';

const MAX_VISIBLE = 10;

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-destructive bg-destructive/10 border-destructive/30',
  high: 'text-destructive bg-destructive/10 border-destructive/30',
  medium: 'text-warning bg-warning/10 border-warning/30',
  low: 'text-muted-foreground bg-muted border-border',
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  in_progress: Play,
  completed: CheckCircle2,
  overdue: AlertTriangle,
};

function isOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

interface ActionItem {
  id: string;
  reference_id?: string | null;
  title: string;
  status: string;
  priority: string;
  due_date?: string | null;
  incident_id?: string | null;
  completed_date?: string | null;
  rejection_notes?: string | null;
  last_return_reason?: string | null;
  return_count?: number | null;
}

interface InlineActionsPanelProps {
  eventTypeFilter?: 'incident' | 'observation';
}

export function InlineActionsPanel({ eventTypeFilter }: InlineActionsPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();
  const { data: rawActions, isLoading } = useMyCorrectiveActions();
  const updateStatus = useUpdateMyActionStatus();

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: ActionItem | null;
    type: 'start' | 'complete';
  }>({ open: false, action: null, type: 'start' });
  const [completionNotes, setCompletionNotes] = useState('');

  // Extension dialog state
  const [extensionAction, setExtensionAction] = useState<ActionItem | null>(null);

  // Filter to unclosed actions only, then by event_type if provided
  const unclosed = ((rawActions || []) as (ActionItem & { incident?: { event_type?: string | null } })[]).filter(
    (a) => a.status !== 'completed' && a.status !== 'verified' && a.status !== 'closed'
  );
  const actions = eventTypeFilter
    ? unclosed.filter((a) => (a as any).incident?.event_type === eventTypeFilter)
    : unclosed;
  const visibleActions = actions.slice(0, MAX_VISIBLE);
  const hasMore = actions.length > MAX_VISIBLE;

  const handleStartWork = (action: ActionItem) => {
    setConfirmDialog({ open: true, action, type: 'start' });
  };

  const handleMarkComplete = (action: ActionItem) => {
    setCompletionNotes('');
    setConfirmDialog({ open: true, action, type: 'complete' });
  };

  const isOverdueNeedsNotes =
    confirmDialog.type === 'complete' &&
    isOverdue(confirmDialog.action?.due_date) &&
    !completionNotes.trim();

  const handleConfirm = async () => {
    if (!confirmDialog.action) return;

    const isOverdueAction = isOverdue(confirmDialog.action.due_date);

    try {
      if (confirmDialog.type === 'start') {
        await updateStatus.mutateAsync({
          id: confirmDialog.action.id,
          status: 'in_progress',
        });
      } else {
        await updateStatus.mutateAsync({
          id: confirmDialog.action.id,
          status: 'completed',
          completionNotes: completionNotes || undefined,
          overdueJustification: isOverdueAction && completionNotes ? completionNotes : undefined,
        });
      }

      setConfirmDialog({ open: false, action: null, type: 'start' });
      setCompletionNotes('');
    } catch (error) {
      // Keep dialog open on error — toast is shown by the mutation hook
      console.error('[InlineActionsPanel] Action failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="pt-3 text-center py-6">
        <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          {t('actionCenter.inlinePanel.noActions', 'No open actions assigned to you')}
        </p>
      </div>
    );
  }

  return (
    <div className="pt-3 space-y-2" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground font-medium">
          {t('actionCenter.inlinePanel.showingCount', 'Showing {{count}} of {{total}}', {
            count: visibleActions.length,
            total: actions.length,
          })}
        </p>
      </div>

      {/* Action Items */}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {visibleActions.map((action) => {
          const overdue = isOverdue(action.due_date);
          const StatusIcon = overdue
            ? STATUS_ICONS.overdue
            : STATUS_ICONS[action.status] || STATUS_ICONS.pending;
          const isPending = action.status === 'pending';
          const isInProgress = action.status === 'in_progress';
          const isReturned = (action.return_count ?? 0) > 0 && action.status === 'pending';

          return (
            <div
              key={action.id}
              className={cn(
                'rounded-lg border p-3 flex flex-col gap-2 transition-colors',
                'hover:bg-muted/50 cursor-pointer',
                overdue && 'border-destructive/40 bg-destructive/5',
                isReturned && 'border-warning/40 bg-warning/5',
              )}
              onClick={() => {
                if (action.incident_id) {
                  navigate(`/incidents/${action.incident_id}`);
                }
              }}
            >
              {/* Top row: status icon, title, priority */}
              <div className="flex items-start gap-2 min-w-0">
                <StatusIcon
                  className={cn(
                    'h-4 w-4 mt-0.5 flex-shrink-0',
                    overdue ? 'text-destructive' : 'text-muted-foreground',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {action.reference_id && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {action.reference_id}
                      </span>
                    )}
                    {isReturned && (
                      <Badge variant="outline" className="text-[9px] h-4 border-warning text-warning">
                        {t('actions.returned', 'Returned')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-tight line-clamp-2 mt-0.5">
                    {action.title}
                  </p>
                  {isReturned && action.last_return_reason && (
                    <p className="text-xs text-warning mt-1 line-clamp-1">
                      {action.last_return_reason}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] flex-shrink-0', PRIORITY_COLORS[action.priority] || '')}
                >
                  {action.priority}
                </Badge>
              </div>

              {/* Bottom row: due date + action buttons */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {action.due_date && (
                    <>
                      <Calendar className="h-3 w-3" />
                      <span className={cn(overdue && 'text-destructive font-medium')}>
                        {new Date(action.due_date).toLocaleDateString(
                          i18n.language === 'ar' ? 'ar-SA' : 'en-US',
                          { month: 'short', day: 'numeric' }
                        )}
                      </span>
                      {overdue && (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1">
                          {t('actions.overdue', 'Overdue')}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {isPending && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 min-h-[44px] text-xs gap-1"
                      onClick={() => handleStartWork(action)}
                      disabled={updateStatus.isPending}
                    >
                      <Play className="h-3 w-3" />
                      {t('actions.startWork', 'Start Work')}
                    </Button>
                  )}
                  {isInProgress && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 min-h-[44px] text-xs gap-1"
                        onClick={() => handleMarkComplete(action)}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {t('actions.markComplete', 'Complete')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 min-h-[44px] text-xs gap-1"
                        onClick={() => setExtensionAction(action)}
                      >
                        <Timer className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All link */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-11 min-h-[44px] text-xs gap-1.5"
          onClick={() => navigate('/incidents/my-actions')}
        >
          {t('actionCenter.inlinePanel.viewAll', 'View All Actions')}
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Button>
      )}

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, action: null, type: 'start' });
        }}
      >
        <DialogContent className="max-w-sm" dir={direction}>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === 'start'
                ? t('actions.confirmStartWork', 'Start Work')
                : t('actions.confirmComplete', 'Mark as Complete')}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action?.title}
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.type === 'complete' && (
            <div className="space-y-2">
              <Label>{t('actions.completionNotes', 'Completion Notes')}</Label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder={t('actions.completionNotesPlaceholder', 'Describe work completed...')}
                rows={3}
              />
              {isOverdue(confirmDialog.action?.due_date) && (
                <p className="text-xs text-destructive">
                  {t('actions.overdueJustificationHint', 'This action is overdue. Please provide justification in the notes above.')}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, action: null, type: 'start' })}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={updateStatus.isPending || isOverdueNeedsNotes}
            >
              {updateStatus.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('common.confirm', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extension Request Dialog */}
      <ExtensionRequestDialog
        action={extensionAction}
        open={!!extensionAction}
        onOpenChange={(open) => {
          if (!open) setExtensionAction(null);
        }}
      />
    </div>
  );
}
