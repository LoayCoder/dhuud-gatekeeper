import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useVerifyAction, InspectionAction } from '@/hooks/use-inspection-actions';

interface ActionVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: InspectionAction | null;
}

export function ActionVerificationDialog({
  open,
  onOpenChange,
  action,
}: ActionVerificationDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [notes, setNotes] = useState('');
  const verifyAction = useVerifyAction();

  const handleVerify = async (approved: boolean) => {
    if (!action) return;
    
    await verifyAction.mutateAsync({
      actionId: action.id,
      verification_notes: notes,
      approved,
    });
    
    setNotes('');
    onOpenChange(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={direction} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('actions.verifyAction')}
          </DialogTitle>
          <DialogDescription>
            {t('actions.verifyDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Action Details */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {action.reference_id && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {action.reference_id}
                  </Badge>
                )}
                <h4 className="font-medium">{action.title}</h4>
              </div>
              <Badge variant={getPriorityColor(action.priority)}>
                {t(`actions.priority.${action.priority}`)}
              </Badge>
            </div>
            
            {action.description && (
              <p className="text-sm text-muted-foreground">{action.description}</p>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t('actions.status')}:</span>
                <span className="ms-1">{t(`actions.statusLabels.${action.status}`)}</span>
              </div>
              {action.assigned_user && (
                <div>
                  <span className="text-muted-foreground">{t('actions.assignedTo')}:</span>
                  <span className="ms-1">{action.assigned_user.full_name}</span>
                </div>
              )}
              {action.due_date && (
                <div>
                  <span className="text-muted-foreground">{t('actions.dueDate')}:</span>
                  <span className="ms-1">{new Date(action.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Verification Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('actions.verificationNotes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('actions.verificationNotesPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={verifyAction.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleVerify(false)}
            disabled={verifyAction.isPending}
          >
            <XCircle className="h-4 w-4 me-2" />
            {t('actions.reject')}
          </Button>
          <Button
            onClick={() => handleVerify(true)}
            disabled={verifyAction.isPending}
          >
            <CheckCircle className="h-4 w-4 me-2" />
            {t('actions.verify')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
