import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, ShieldAlert, User, Building, Calendar, Phone, Mail, CreditCard } from 'lucide-react';
import { useVisitRequests, useApproveVisitRequest, useRejectVisitRequest } from '@/hooks/use-visit-requests';
import { useCheckBlacklist } from '@/hooks/use-security-blacklist';
import { format } from 'date-fns';

interface VisitApprovalDialogProps {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VisitApprovalDialog({ requestId, open, onOpenChange }: VisitApprovalDialogProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  
  const { data: requests } = useVisitRequests();
  const request = requests?.find(r => r.id === requestId);
  
  const { data: blacklistCheck, isLoading: checkingBlacklist } = useCheckBlacklist(request?.visitor?.national_id ?? undefined);
  
  const approveMutation = useApproveVisitRequest();
  const rejectMutation = useRejectVisitRequest();

  useEffect(() => {
    if (open) {
      setNotes('');
      setIsRejecting(false);
    }
  }, [open]);

  const handleApprove = async () => {
    if (!requestId) return;
    await approveMutation.mutateAsync({ id: requestId, notes });
    onOpenChange(false);
  };

  const handleReject = async () => {
    if (!requestId || !notes) return;
    await rejectMutation.mutateAsync({ id: requestId, reason: notes });
    onOpenChange(false);
  };

  if (!request) return null;

  const isBlacklisted = !!blacklistCheck;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('visitors.approval.title')}</DialogTitle>
          <DialogDescription>{t('visitors.approval.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Blacklist Warning */}
          {isBlacklisted && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>{t('visitors.blacklist.warning')}</AlertTitle>
              <AlertDescription>
                {t('visitors.blacklist.reason')}: {blacklistCheck.reason}
              </AlertDescription>
            </Alert>
          )}

          {checkingBlacklist && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{t('visitors.blacklist.checking')}</AlertDescription>
            </Alert>
          )}

          {!isBlacklisted && !checkingBlacklist && request.visitor?.national_id && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                {t('visitors.blacklist.cleared')}
              </AlertDescription>
            </Alert>
          )}

          {/* Visitor Details */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('visitors.details.visitor')}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t('visitors.fields.name')}:</span>
                <p className="font-medium">{request.visitor?.full_name}</p>
              </div>
              {request.visitor?.company_name && (
                <div>
                  <span className="text-muted-foreground">{t('visitors.fields.company')}:</span>
                  <p className="font-medium">{request.visitor.company_name}</p>
                </div>
              )}
              {request.visitor?.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>{request.visitor.email}</span>
                </div>
              )}
              {request.visitor?.national_id && (
                <div className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3 text-muted-foreground" />
                  <span>{request.visitor.national_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Visit Details */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('visitors.details.visit')}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t('visitors.fields.site')}:</span>
                <p className="font-medium">{request.site?.name}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">{t('visitors.fields.validity')}:</span>
                <p className="font-medium">
                  {format(new Date(request.valid_from), 'PPp')} - {format(new Date(request.valid_until), 'PPp')}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {isRejecting ? t('visitors.approval.rejectionReason') + ' *' : t('visitors.approval.notes')}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isRejecting ? t('visitors.approval.rejectionPlaceholder') : t('visitors.approval.notesPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {isRejecting ? (
            <>
              <Button variant="outline" onClick={() => setIsRejecting(false)}>
                {t('common.cancel')}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={!notes || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? t('common.loading') : t('visitors.actions.confirmReject')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setIsRejecting(true)}
              >
                {t('visitors.actions.reject')}
              </Button>
              <Button 
                onClick={handleApprove}
                disabled={isBlacklisted || approveMutation.isPending}
              >
                {approveMutation.isPending ? t('common.loading') : t('visitors.actions.approve')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
