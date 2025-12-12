import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Clock, Loader2, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useApproveIncidentClosure, useRejectIncidentClosure, useCanCloseIncident } from '@/hooks/use-incident-closure';
import { formatDistanceToNow } from 'date-fns';

interface IncidentClosureApprovalCardProps {
  incidentId: string;
  incidentTitle: string;
  incidentStatus: string;
  requestedBy: string | null;
  requestedAt: string | null;
  requestNotes: string | null;
  requesterName?: string;
}

export function IncidentClosureApprovalCard({
  incidentId,
  incidentTitle,
  incidentStatus,
  requestedBy,
  requestedAt,
  requestNotes,
  requesterName,
}: IncidentClosureApprovalCardProps) {
  const { t } = useTranslation();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Determine if this is the final closure (all actions verified) or investigation approval
  const isFinalClosure = incidentStatus === 'pending_final_closure';

  const { data: closureCheck } = useCanCloseIncident(incidentId);
  const approveClosure = useApproveIncidentClosure();
  const rejectClosure = useRejectIncidentClosure();

  const handleApprove = async () => {
    await approveClosure.mutateAsync({ incidentId, isFinalClosure });
  };

  const handleReject = async () => {
    if (!rejectionNotes.trim()) return;
    await rejectClosure.mutateAsync({
      incidentId,
      rejectionNotes: rejectionNotes.trim(),
    });
    setShowRejectDialog(false);
    setRejectionNotes('');
  };

  const requestedTimeAgo = requestedAt
    ? formatDistanceToNow(new Date(requestedAt), { addSuffix: true })
    : '';

  return (
    <>
      <Card className={`border-amber-300 ${isFinalClosure ? 'bg-green-50 dark:bg-green-950/50 border-green-300 dark:border-green-700' : 'bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className={`h-5 w-5 ${isFinalClosure ? 'text-green-600' : 'text-amber-600'}`} />
              <CardTitle className={`text-lg ${isFinalClosure ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
                {isFinalClosure
                  ? t('investigation.pendingFinalClosure', 'Pending Final Closure')
                  : t('investigation.pendingInvestigationApproval', 'Pending Investigation Approval')
                }
              </CardTitle>
            </div>
            <Badge variant="secondary" className={isFinalClosure ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}>
              {t('investigation.awaitingApproval', 'Awaiting Approval')}
            </Badge>
          </div>
          <CardDescription className={isFinalClosure ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}>
            {isFinalClosure
              ? t('investigation.finalClosureDescription', 'All corrective actions have been verified. Ready for final closure.')
              : t('investigation.investigationApprovalDescription', 'An investigator has submitted the investigation for your approval.')
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Request Info */}
          <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
            <div className={`flex items-center gap-2 text-sm ${isFinalClosure ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
              <User className="h-4 w-4" />
              <span className="font-medium">{requesterName || (isFinalClosure ? t('common.system', 'System') : t('common.unknown', 'Unknown'))}</span>
              <span className={isFinalClosure ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>•</span>
              <span className={isFinalClosure ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>{requestedTimeAgo}</span>
            </div>
            
            {requestNotes && (
              <p className={`mt-2 text-sm italic ${isFinalClosure ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                "{requestNotes}"
              </p>
            )}
          </div>

          {/* Action Status */}
          {closureCheck && (
            <div className="text-sm">
              <span className="text-amber-700 dark:text-amber-300">
                {t('investigation.actionStatus', 'Action Status')}:
              </span>{' '}
              <span className="font-medium">
                {closureCheck.verified_actions}/{closureCheck.total_actions}{' '}
                {t('investigation.actionsVerified', 'verified')}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
              onClick={() => setShowRejectDialog(true)}
              disabled={rejectClosure.isPending}
            >
              <XCircle className="me-2 h-4 w-4" />
              {t('investigation.rejectClosure', 'Reject')}
            </Button>
            <Button
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
              onClick={handleApprove}
              disabled={approveClosure.isPending || (!isFinalClosure && !closureCheck?.can_close)}
            >
              {approveClosure.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="me-2 h-4 w-4" />
              )}
              {isFinalClosure
                ? t('investigation.approveFinalClosure', 'Approve & Close Incident')
                : t('investigation.approveInvestigation', 'Approve Investigation')
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isFinalClosure
                ? t('investigation.rejectFinalClosureTitle', 'Reject Final Closure')
                : t('investigation.rejectInvestigationTitle', 'Reject Investigation')
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isFinalClosure
                ? t('investigation.rejectFinalClosureDescription', 'Please provide a reason for rejecting the final closure. The investigation will remain open.')
                : t('investigation.rejectInvestigationDescription', 'Please provide a reason for rejecting the investigation. The investigator will be notified.')
              }
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label htmlFor="rejection-notes">
              {t('investigation.rejectionReason', 'Rejection Reason')} *
            </Label>
            <Textarea
              id="rejection-notes"
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder={t('investigation.rejectionReasonPlaceholder', 'Explain why additional work is needed...')}
              rows={3}
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectionNotes.trim() || rejectClosure.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {rejectClosure.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('investigation.confirmReject', 'Reject Closure')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
