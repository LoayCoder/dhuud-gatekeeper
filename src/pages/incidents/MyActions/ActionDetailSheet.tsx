import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  PlayCircle, FileCheck, CalendarPlus, AlertTriangle, Clock,
  CheckCircle2, RotateCcw, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusIcon, getPriorityBadgeVariant, formatFallbackLabel } from './helpers';
import type { ActionForDialog } from './types';

interface ActionDetailSheetProps {
  action: ActionForDialog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartWork?: (action: ActionForDialog) => void;
  onSubmitForVerification?: (action: ActionForDialog) => void;
  onRequestExtension?: (action: ActionForDialog) => void;
}

export function ActionDetailSheet({
  action, open, onOpenChange,
  onStartWork, onSubmitForVerification, onRequestExtension,
}: ActionDetailSheetProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  if (!action) return null;

  const isClosed = action.status === 'closed' || action.status === 'verified';
  const canStart = action.status === 'assigned' || action.status === 'pending' || action.status === 'returned_for_correction';
  const canComplete = action.status === 'in_progress';
  const isOverdue = action.due_date ? new Date(action.due_date) < new Date() : false;
  const isReturned = action.status === 'returned_for_correction';

  // Access extended fields if available
  const ext = action as unknown as Record<string, unknown>;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={direction === 'rtl' ? 'left' : 'right'} dir={direction} className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-start">
            {getStatusIcon(action.status ?? null)}
            <span className="truncate">{action.title}</span>
          </SheetTitle>
          <SheetDescription className="text-start">
            {action.source === 'inspection'
              ? t('investigation.source.inspection', 'Inspection')
              : t('investigation.source.incident', 'Incident')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Return feedback banner */}
          {isReturned && (
            <div className="rounded-md bg-warning/10 border border-warning/30 p-3 space-y-1">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">
                  {t('actions.returnedForCorrection', 'Returned for Correction')}
                </span>
              </div>
              {ext.last_return_reason && (
                <p className="text-sm text-muted-foreground">{String(ext.last_return_reason)}</p>
              )}
              {ext.return_count && (
                <p className="text-xs text-muted-foreground">
                  {t('actions.returnCount', 'Return count')}: {String(ext.return_count)}
                </p>
              )}
            </div>
          )}

          {/* Details */}
          <div className="space-y-3">
            {action.description && (
              <div>
                <Label>{t('common.description', 'Description')}</Label>
                <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label={t('common.status', 'Status')}>
                <Badge variant="outline">{formatFallbackLabel(action.status)}</Badge>
              </Detail>
              {action.priority && (
                <Detail label={t('investigation.actions.priority', 'Priority')}>
                  <Badge variant={getPriorityBadgeVariant(action.priority)}>{formatFallbackLabel(action.priority)}</Badge>
                </Detail>
              )}
              {action.due_date && (
                <Detail label={t('investigation.dueDate', 'Due Date')}>
                  <span className={cn('flex items-center gap-1', isOverdue && !isClosed ? 'text-destructive font-medium' : '')}>
                    <Clock className="h-3 w-3" />
                    {new Date(action.due_date).toLocaleDateString(i18n.language)}
                    {isOverdue && !isClosed && <AlertTriangle className="h-3 w-3" />}
                  </span>
                </Detail>
              )}
              {ext.reference_id && (
                <Detail label={t('common.reference', 'Reference')}>
                  <span className="font-mono text-xs">{String(ext.reference_id)}</span>
                </Detail>
              )}
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t('actions.timeline', 'Timeline')}</h4>
            <div className="space-y-2 text-xs">
              {ext.created_at && (
                <TimelineEntry
                  icon={<FileText className="h-3 w-3" />}
                  label={t('actions.created', 'Created')}
                  date={String(ext.created_at)}
                  lang={i18n.language}
                />
              )}
              {ext.started_at && (
                <TimelineEntry
                  icon={<PlayCircle className="h-3 w-3 text-info" />}
                  label={t('actions.workStarted', 'Work Started')}
                  date={String(ext.started_at)}
                  lang={i18n.language}
                />
              )}
              {ext.completed_date && (
                <TimelineEntry
                  icon={<FileCheck className="h-3 w-3 text-primary" />}
                  label={t('actions.submitted', 'Submitted for Verification')}
                  date={String(ext.completed_date)}
                  lang={i18n.language}
                />
              )}
              {ext.verified_at && (
                <TimelineEntry
                  icon={<CheckCircle2 className="h-3 w-3 text-success" />}
                  label={t('actions.verified', 'Verified & Closed')}
                  date={String(ext.verified_at)}
                  lang={i18n.language}
                />
              )}
              {ext.rejected_at && (
                <TimelineEntry
                  icon={<RotateCcw className="h-3 w-3 text-warning" />}
                  label={t('actions.returned', 'Returned')}
                  date={String(ext.rejected_at)}
                  lang={i18n.language}
                  note={ext.last_return_reason ? String(ext.last_return_reason) : undefined}
                />
              )}
            </div>
          </div>

          {/* Notes sections */}
          {ext.progress_notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-1">{t('actions.progressNotes', 'Progress Notes')}</h4>
                <p className="text-sm text-muted-foreground">{String(ext.progress_notes)}</p>
              </div>
            </>
          )}
          {ext.completion_notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-1">{t('actions.completionNotes', 'Completion Notes')}</h4>
                <p className="text-sm text-muted-foreground">{String(ext.completion_notes)}</p>
              </div>
            </>
          )}
          {ext.verification_notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-1">{t('actions.verificationNotes', 'Verification Notes')}</h4>
                <p className="text-sm text-muted-foreground">{String(ext.verification_notes)}</p>
              </div>
            </>
          )}

          {/* Action Buttons */}
          {!isClosed && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                {canStart && onStartWork && (
                  <Button onClick={() => { onStartWork(action); onOpenChange(false); }}>
                    <PlayCircle className="h-4 w-4 me-2" />
                    {t('investigation.actions.startWork', 'Start Work')}
                  </Button>
                )}
                {canComplete && onSubmitForVerification && (
                  <Button onClick={() => { onSubmitForVerification(action); onOpenChange(false); }}>
                    <FileCheck className="h-4 w-4 me-2" />
                    {t('actions.submitForVerification', 'Submit for Verification')}
                  </Button>
                )}
                {(canStart || canComplete) && action.due_date && onRequestExtension && (
                  <Button variant="outline" onClick={() => { onRequestExtension(action); onOpenChange(false); }}>
                    <CalendarPlus className="h-4 w-4 me-2" />
                    {t('actions.requestExtension', 'Request Extension')}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-muted-foreground">{children}</p>;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function TimelineEntry({ icon, label, date, lang, note }: { icon: React.ReactNode; label: string; date: string; lang: string; note?: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div>
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground ms-1">{new Date(date).toLocaleDateString(lang)}</span>
        {note && <p className="text-muted-foreground mt-0.5">{note}</p>}
      </div>
    </div>
  );
}
