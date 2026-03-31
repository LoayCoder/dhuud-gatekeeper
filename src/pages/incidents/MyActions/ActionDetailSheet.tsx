import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  PlayCircle, FileCheck, CalendarPlus, AlertTriangle, Clock,
  CheckCircle2, RotateCcw, FileText, ShieldCheck, XCircle, Loader2,
  Wrench, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusIcon, getPriorityBadgeVariant, formatFallbackLabel } from './helpers';
import { ActionEvidenceSection } from '@/features/incidents/components/inspections/sessions/ActionEvidenceSection';
import { useVerifyAction } from '@/features/incidents';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  const { user } = useAuth();
  const verifyAction = useVerifyAction();
  const [verifyMode, setVerifyMode] = useState<'approve' | 'reject' | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');

  // Role-based check: can current user verify actions?
  const { data: canVerify } = useQuery({
    queryKey: ['can-verify-action', user?.id, action?.id],
    queryFn: async () => {
      if (!user?.id || !action) return false;
      // Self-approval prevention: assignee cannot verify their own action
      if (action.assigned_to === user.id) return false;
      // Check if user has inspector/HSSE role
      const { data: hasRole } = await supabase.rpc('has_role_by_code', {
        p_user_id: user.id,
        p_role_code: 'hsse_officer',
      });
      if (hasRole) return true;
      const { data: hasManagerRole } = await supabase.rpc('has_role_by_code', {
        p_user_id: user.id,
        p_role_code: 'hsse_manager',
      });
      if (hasManagerRole) return true;
      const { data: hasAdminRole } = await supabase.rpc('has_role_by_code', {
        p_user_id: user.id,
        p_role_code: 'admin',
      });
      return !!hasAdminRole;
    },
    enabled: !!user?.id && !!action && action.status === 'completed',
    refetchOnMount: 'always',
  });

  if (!action) return null;

  const isClosed = action.status === 'closed' || action.status === 'verified';
  const canStart = action.status === 'assigned' || action.status === 'pending' || action.status === 'returned_for_correction';
  const canComplete = action.status === 'in_progress';
  const isPendingVerification = action.status === 'completed';
  const isOverdue = action.due_date ? new Date(action.due_date) < new Date() : false;
  const isReturned = action.status === 'returned_for_correction';
  const showVerificationUI = isPendingVerification && canVerify;

  const handleVerify = async (approved: boolean) => {
    if (!approved && !verifyNotes.trim()) return;
    await verifyAction.mutateAsync({
      actionId: action.id,
      approved,
      verification_notes: verifyNotes || undefined,
    });
    setVerifyMode(null);
    setVerifyNotes('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setVerifyMode(null);
      setVerifyNotes('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
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
              {action.last_return_reason && (
                <p className="text-sm text-muted-foreground">{action.last_return_reason}</p>
              )}
              {action.return_count && (
                <p className="text-xs text-muted-foreground">
                  {t('actions.returnCount', 'Return count')}: {action.return_count}
                </p>
              )}
            </div>
          )}

          {/* Pending Verification banner */}
          {isPendingVerification && (
            <div className="rounded-md bg-info/10 border border-info/30 p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-info" />
                <span className="text-sm font-medium text-info">
                  {t('actions.pendingVerification', 'Pending Verification')}
                </span>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="space-y-3">
            {action.description && (
              <div>
                <DetailLabel>{t('common.description', 'Description')}</DetailLabel>
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
              {action.reference_id && (
                <Detail label={t('common.reference', 'Reference')}>
                  <span className="font-mono text-xs">{action.reference_id}</span>
                </Detail>
              )}
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t('actions.timeline', 'Timeline')}</h4>
            <div className="space-y-2 text-xs">
              {action.created_at && (
                <TimelineEntry
                  icon={<FileText className="h-3 w-3" />}
                  label={t('actions.created', 'Created')}
                  date={action.created_at}
                  lang={i18n.language}
                />
              )}
              {action.started_at && (
                <TimelineEntry
                  icon={<PlayCircle className="h-3 w-3 text-info" />}
                  label={t('actions.workStarted', 'Work Started')}
                  date={action.started_at}
                  lang={i18n.language}
                />
              )}
              {action.completed_date && (
                <TimelineEntry
                  icon={<FileCheck className="h-3 w-3 text-primary" />}
                  label={t('actions.submitted', 'Submitted for Verification')}
                  date={action.completed_date}
                  lang={i18n.language}
                />
              )}
              {action.verified_at && (
                <TimelineEntry
                  icon={<CheckCircle2 className="h-3 w-3 text-success" />}
                  label={t('actions.verified', 'Verified & Closed')}
                  date={action.verified_at}
                  lang={i18n.language}
                />
              )}
              {action.rejected_at && (
                <TimelineEntry
                  icon={<RotateCcw className="h-3 w-3 text-warning" />}
                  label={t('actions.returned', 'Returned')}
                  date={action.rejected_at}
                  lang={i18n.language}
                  note={action.last_return_reason ?? undefined}
                />
              )}
            </div>
          </div>

          {/* Notes sections */}
          {action.progress_notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-1">{t('actions.progressNotes', 'Progress Notes')}</h4>
                <p className="text-sm text-muted-foreground">{action.progress_notes}</p>
              </div>
            </>
          )}
          {action.completion_notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-1">{t('actions.completionNotes', 'Completion Notes')}</h4>
                <p className="text-sm text-muted-foreground">{action.completion_notes}</p>
              </div>
            </>
          )}
          {action.verification_notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-1">{t('actions.verificationNotes', 'Verification Notes')}</h4>
                <p className="text-sm text-muted-foreground">{action.verification_notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Evidence Section */}
          <div>
            <h4 className="text-sm font-semibold mb-2">{t('actions.evidence', 'Evidence')}</h4>
            <ActionEvidenceSection
              actionId={action.id}
              sessionId={action.session_id || action.incident_id || undefined}
              isLocked={isClosed}
            />
          </div>

          {/* Verification UI for reviewer when action is pending verification */}
          {showVerificationUI && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">{t('actions.reviewAction', 'Review Action')}</h4>

                {verifyMode === null ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setVerifyMode('approve')}
                    >
                      <CheckCircle2 className="h-4 w-4 me-1" />
                      {t('actions.verifyAndClose', 'Verify & Close')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setVerifyMode('reject')}
                    >
                      <XCircle className="h-4 w-4 me-1" />
                      {t('actions.returnForCorrection', 'Return for Correction')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      placeholder={
                        verifyMode === 'approve'
                          ? t('actions.verificationNotesPlaceholder', 'Optional verification notes...')
                          : t('actions.rejectionReasonPlaceholder', 'Reason for returning (required)...')
                      }
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setVerifyMode(null); setVerifyNotes(''); }}
                        disabled={verifyAction.isPending}
                      >
                        {t('common.cancel', 'Cancel')}
                      </Button>
                      <Button
                        size="sm"
                        variant={verifyMode === 'approve' ? 'default' : 'destructive'}
                        onClick={() => handleVerify(verifyMode === 'approve')}
                        disabled={verifyAction.isPending || (verifyMode === 'reject' && !verifyNotes.trim())}
                      >
                        {verifyAction.isPending && <Loader2 className="h-4 w-4 me-1 animate-spin" />}
                        {verifyMode === 'approve'
                          ? t('actions.confirmApprove', 'Confirm Approval')
                          : t('actions.confirmReturn', 'Confirm Return')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Assignee Action Buttons */}
          {!isClosed && !isPendingVerification && (
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

function DetailLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-muted-foreground">{children}</p>;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <DetailLabel>{label}</DetailLabel>
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
