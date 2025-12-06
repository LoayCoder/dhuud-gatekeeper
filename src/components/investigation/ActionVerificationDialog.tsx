import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, FileText, User, Calendar, Building2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useVerifyAction, type PendingActionApproval } from '@/hooks/use-pending-approvals';

interface ActionVerificationDialogProps {
  action: PendingActionApproval | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActionVerificationDialog({
  action,
  open,
  onOpenChange,
}: ActionVerificationDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [notes, setNotes] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const verifyAction = useVerifyAction();

  const handleVerify = async () => {
    if (!action) return;
    await verifyAction.mutateAsync({
      actionId: action.id,
      approved: true,
      notes: notes.trim() || undefined,
    });
    handleClose();
  };

  const handleReject = async () => {
    if (!action) return;
    await verifyAction.mutateAsync({
      actionId: action.id,
      approved: false,
      notes: notes.trim() || undefined,
    });
    handleClose();
  };

  const handleClose = () => {
    setNotes('');
    setIsRejecting(false);
    onOpenChange(false);
  };

  const getPriorityVariant = (priority: string | null): 'destructive' | 'secondary' | 'outline' => {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('investigation.approvals.verifyAction', 'Verify Action')}
          </DialogTitle>
          <DialogDescription>
            {t('investigation.approvals.verifyActionDescription', 'Review the completed action and verify or reject it.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Details */}
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-lg">{action.title}</h4>
              {action.description && (
                <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {action.priority && (
                <Badge variant={getPriorityVariant(action.priority)}>
                  {t(`investigation.priority.${action.priority}`, action.priority)}
                </Badge>
              )}
              {action.category && (
                <Badge variant="outline">
                  {t(`investigation.actionCategory.${action.category}`, action.category)}
                </Badge>
              )}
              {action.linked_cause_type && (
                <Badge variant="secondary">
                  {t(`investigation.${action.linked_cause_type}`, action.linked_cause_type)}
                </Badge>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 text-sm">
              {action.assigned_user && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{action.assigned_user.full_name || t('common.unknown')}</span>
                </div>
              )}
              {action.department && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{action.department.name}</span>
                </div>
              )}
              {action.due_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t('investigation.dueDate', 'Due')}: {new Date(action.due_date).toLocaleDateString()}</span>
                </div>
              )}
              {action.completed_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{t('investigation.completedOn', 'Completed')}: {new Date(action.completed_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {action.incident && (
              <>
                <Separator />
                <div className="text-sm">
                  <span className="font-medium">{t('investigation.relatedIncident', 'Related Event')}: </span>
                  <span className="text-muted-foreground">
                    {action.incident.reference_id} - {action.incident.title}
                  </span>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Notes Input */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {isRejecting 
                ? t('investigation.approvals.rejectionNotes', 'Rejection Notes')
                : t('investigation.approvals.verificationNotes', 'Verification Notes')
              }
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isRejecting
                  ? t('investigation.approvals.rejectionNotesPlaceholder', 'Explain why this action is being rejected...')
                  : t('investigation.approvals.verificationNotesPlaceholder', 'Optional notes about this verification...')
              }
              rows={3}
            />
          </div>

          {isRejecting && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                {t('investigation.approvals.rejectWarning', 'Rejecting will return the action to the assignee.')}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!isRejecting ? (
            <>
              <Button variant="outline" onClick={() => setIsRejecting(true)}>
                <XCircle className="h-4 w-4 me-2" />
                {t('investigation.approvals.reject', 'Reject')}
              </Button>
              <Button 
                onClick={handleVerify} 
                disabled={verifyAction.isPending}
              >
                <CheckCircle2 className="h-4 w-4 me-2" />
                {t('investigation.approvals.verify', 'Verify')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsRejecting(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                variant="destructive"
                onClick={handleReject}
                disabled={verifyAction.isPending}
              >
                <XCircle className="h-4 w-4 me-2" />
                {t('investigation.approvals.confirmReject', 'Confirm Rejection')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
