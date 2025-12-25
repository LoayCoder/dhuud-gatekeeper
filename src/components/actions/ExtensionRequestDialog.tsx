import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, AlertTriangle, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useRequestExtension, useActionExtensionRequest } from '@/hooks/use-action-extensions';

interface ExtensionRequestDialogProps {
  action: {
    id: string;
    reference_id?: string | null;
    title: string;
    due_date?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExtensionRequestDialog({
  action,
  open,
  onOpenChange,
}: ExtensionRequestDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [requestedDate, setRequestedDate] = useState('');
  const [reason, setReason] = useState('');

  const requestExtension = useRequestExtension();
  const { data: existingRequest } = useActionExtensionRequest(action?.id || null);

  // Set minimum date to tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const isValid = requestedDate && reason.trim().length >= 10;

  const handleSubmit = async () => {
    if (!action || !isValid || !action.due_date) return;

    await requestExtension.mutateAsync({
      actionId: action.id,
      currentDueDate: action.due_date,
      requestedDueDate: requestedDate,
      reason: reason.trim(),
    });

    handleClose();
  };

  const handleClose = () => {
    setRequestedDate('');
    setReason('');
    onOpenChange(false);
  };

  useEffect(() => {
    if (open) {
      setRequestedDate('');
      setReason('');
    }
  }, [open]);

  if (!action) return null;

  const hasPendingRequest = existingRequest && existingRequest.status === 'pending_hsse';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('actions.requestExtension', 'Request Extension')}
          </DialogTitle>
          <DialogDescription>
            {t('actions.requestExtensionDescription', 'Request additional time to complete this action. Requires approval from HSSE Expert.')}
          </DialogDescription>
        </DialogHeader>

        {hasPendingRequest ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('actions.extensionAlreadyRequested', 'An extension request is already pending for this action.')}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* Action Info */}
            <div className="p-3 bg-muted rounded-md">
              <div className="flex items-center gap-2 flex-wrap">
                {action.reference_id && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {action.reference_id}
                  </Badge>
                )}
                <p className="font-medium">{action.title}</p>
              </div>
              {action.due_date && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('actions.currentDueDate', 'Current Due Date')}: {new Date(action.due_date).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Requested Date */}
            <div className="space-y-2">
              <Label htmlFor="requestedDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('actions.requestedDueDate', 'Requested New Due Date')} *
              </Label>
              <Input
                id="requestedDate"
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                min={minDateStr}
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                {t('actions.extensionReason', 'Reason for Extension')} *
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('actions.extensionReasonPlaceholder', 'Explain why you need additional time...')}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {t('actions.minChars10', 'Minimum 10 characters')}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          {!hasPendingRequest && (
            <Button
              onClick={handleSubmit}
              disabled={!isValid || requestExtension.isPending}
            >
              {requestExtension.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('actions.submitRequest', 'Submit Request')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
