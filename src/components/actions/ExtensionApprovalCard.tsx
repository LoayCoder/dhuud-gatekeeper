import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, XCircle, User, Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ExtensionRequest, useApproveExtensionManager, useApproveExtensionHSSE } from '@/hooks/use-action-extensions';

interface ExtensionApprovalCardProps {
  request: ExtensionRequest;
  level: 'manager' | 'hsse';
}

export function ExtensionApprovalCard({ request, level }: ExtensionApprovalCardProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const approveManager = useApproveExtensionManager();
  const approveHSSE = useApproveExtensionHSSE();

  const isPending = level === 'manager' ? approveManager.isPending : approveHSSE.isPending;

  const handleApprove = async () => {
    if (level === 'manager') {
      await approveManager.mutateAsync({
        requestId: request.id,
        approved: true,
        notes: notes.trim() || undefined,
      });
    } else {
      await approveHSSE.mutateAsync({
        requestId: request.id,
        actionId: request.action_id,
        newDueDate: request.requested_due_date,
        approved: true,
        notes: notes.trim() || undefined,
      });
    }
    setNotes('');
    setIsRejecting(false);
  };

  const handleReject = async () => {
    if (level === 'manager') {
      await approveManager.mutateAsync({
        requestId: request.id,
        approved: false,
        notes: notes.trim() || undefined,
      });
    } else {
      await approveHSSE.mutateAsync({
        requestId: request.id,
        actionId: request.action_id,
        newDueDate: request.requested_due_date,
        approved: false,
        notes: notes.trim() || undefined,
      });
    }
    setNotes('');
    setIsRejecting(false);
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-amber-200 dark:border-amber-900">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">
              {t('actions.extensionRequest', 'Extension Request')}
            </CardTitle>
          </div>
          <Badge variant="secondary">
            {level === 'manager'
              ? t('actions.pendingManagerApproval', 'Pending Manager')
              : t('actions.pendingHSSEApproval', 'Pending HSSE')
            }
          </Badge>
        </div>
        {request.action && (
          <CardDescription className="flex items-center gap-2 flex-wrap">
            {request.action.reference_id && (
              <Badge variant="outline" className="font-mono text-xs">
                {request.action.reference_id}
              </Badge>
            )}
            <span>{request.action.title}</span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {request.requester && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{(request.requester as { full_name: string | null }).full_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{t('actions.currentDue', 'Current')}: {new Date(request.current_due_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground col-span-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium">{t('actions.requestedDue', 'Requested')}: {new Date(request.requested_due_date).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm font-medium mb-1">{t('actions.reason', 'Reason')}:</p>
          <p className="text-sm text-muted-foreground">{request.extension_reason}</p>
        </div>

        {level === 'hsse' && request.manager_notes && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">{t('actions.managerNotes', 'Manager Notes')}:</p>
            <p className="text-sm text-muted-foreground">{request.manager_notes}</p>
          </div>
        )}

        <Separator />

        {isRejecting ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="rejection-notes">
                {t('actions.rejectionNotes', 'Rejection Notes')}
              </Label>
              <Textarea
                id="rejection-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('actions.rejectionNotesPlaceholder', 'Explain why this extension is being rejected...')}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsRejecting(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReject}
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                <XCircle className="h-4 w-4 me-2" />
                {t('actions.confirmReject', 'Confirm Rejection')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="approval-notes">
                {t('actions.approvalNotes', 'Notes (Optional)')}
              </Label>
              <Textarea
                id="approval-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('actions.approvalNotesPlaceholder', 'Add optional notes...')}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsRejecting(true)}>
                <XCircle className="h-4 w-4 me-2" />
                {t('actions.reject', 'Reject')}
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                <CheckCircle2 className="h-4 w-4 me-2" />
                {level === 'manager'
                  ? t('actions.approveAndForward', 'Approve & Forward')
                  : t('actions.approveExtension', 'Approve Extension')
                }
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
