import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useIsAdmin, useAdminOverrideApproval } from '@/hooks/use-admin-override-approval';

interface AdminOverrideApprovalCardProps {
  incidentId: string;
  referenceId: string;
  currentStatus: string;
  assignedToName?: string;
  onComplete?: () => void;
}

const STATUS_NEXT_MAP: Record<string, string> = {
  pending_dept_rep_approval: 'pending_manager_approval',
  pending_dept_rep_incident_review: 'pending_manager_approval',
  pending_manager_approval: 'investigation_in_progress',
  pending_hsse_escalation_review: 'pending_manager_approval',
  pending_hsse_validation: 'pending_manager_approval',
  pending_investigation_approval: 'closed',
};

const OVERRIDABLE_STATUSES = Object.keys(STATUS_NEXT_MAP);

export function AdminOverrideApprovalCard({
  incidentId,
  referenceId,
  currentStatus,
  assignedToName,
  onComplete,
}: AdminOverrideApprovalCardProps) {
  const { t } = useTranslation();
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const override = useAdminOverrideApproval();
  
  const [open, setOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [originalApprover, setOriginalApprover] = useState(assignedToName || '');

  // Don't show if not admin or status is not overridable
  if (checkingAdmin || !isAdmin || !OVERRIDABLE_STATUSES.includes(currentStatus)) {
    return null;
  }

  const nextStatus = STATUS_NEXT_MAP[currentStatus];

  const handleOverride = async () => {
    if (overrideReason.length < 10) return;

    await override.mutateAsync({
      incidentId,
      overrideReason,
      originalApprover: originalApprover || 'Unknown',
    });

    setOpen(false);
    setOverrideReason('');
    setOriginalApprover('');
    onComplete?.();
  };

  return (
    <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-5 w-5" />
          {t('admin.override.cardTitle')}
        </CardTitle>
        <CardDescription>
          {t('admin.override.cardDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 border-amber-300 bg-amber-100/50 dark:border-amber-700 dark:bg-amber-900/30">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>{t('admin.override.currentStatus')}: {t(`incident.statuses.${currentStatus}`)}</AlertTitle>
          <AlertDescription>
            {t('admin.override.willMoveTo')}: <Badge variant="outline">{t(`incident.statuses.${nextStatus}`)}</Badge>
          </AlertDescription>
        </Alert>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30">
              <ShieldCheck className="h-4 w-4 me-2" />
              {t('admin.override.overrideApproval')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                {t('admin.override.modalTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('admin.override.modalDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p><strong>{t('common.reference')}:</strong> {referenceId}</p>
                <p><strong>{t('admin.override.currentStatus')}:</strong> {t(`incident.statuses.${currentStatus}`)}</p>
                <p><strong>{t('admin.override.willMoveTo')}:</strong> {t(`incident.statuses.${nextStatus}`)}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="originalApprover">{t('admin.override.originalApprover')}</Label>
                <Input
                  id="originalApprover"
                  value={originalApprover}
                  onChange={(e) => setOriginalApprover(e.target.value)}
                  placeholder={t('admin.override.originalApproverPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="overrideReason">
                  {t('admin.override.reason')} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="overrideReason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder={t('admin.override.reasonPlaceholder')}
                  rows={4}
                  className={overrideReason.length > 0 && overrideReason.length < 10 ? 'border-destructive' : ''}
                />
                {overrideReason.length > 0 && overrideReason.length < 10 && (
                  <p className="text-xs text-destructive">{t('admin.override.reasonMinLength')}</p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleOverride}
                disabled={overrideReason.length < 10 || override.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {override.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t('admin.override.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
