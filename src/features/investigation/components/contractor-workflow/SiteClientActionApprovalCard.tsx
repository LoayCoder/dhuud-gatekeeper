import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ClipboardCheck, AlertCircle } from 'lucide-react';
import { useSiteClientApproveActions } from '@/features/contractors/hooks/use-contractor-observation-workflow';

interface SiteClientActionApprovalCardProps {
  incidentId: string;
  status: string;
  actionsCount: number;
  consultantNotes?: string;
}

export function SiteClientActionApprovalCard({
  incidentId,
  status,
  actionsCount,
  consultantNotes
}: SiteClientActionApprovalCardProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  
  const { mutate: approve, isPending } = useSiteClientApproveActions();

  if (status !== 'pending_site_client_approval') return null;

  const handleDecision = (decision: 'approved' | 'rejected') => {
    approve({
      incidentId,
      decision,
      notes: notes.trim() || undefined
    });
  };

  return (
    <Card className="border-info/20 bg-info/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="h-5 w-5 text-info" />
          {t('workflow.siteClientApproval', 'Site Client Approval')}
          <Badge variant="secondary" className="ms-auto">
            {t('workflow.pendingApproval', 'Pending Approval')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('workflow.correctiveActions', 'Corrective Actions')}
            </span>
            <Badge variant="outline">{actionsCount}</Badge>
          </div>
          {consultantNotes && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>{t('workflow.consultantNotes', 'Consultant Notes')}:</strong> {consultantNotes}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-info/30 bg-info/10 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-info mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {t('workflow.siteClientInstructions', 
                'Review the proposed corrective actions. Approve to send to the Contractor Representative for implementation, or reject to return to the Consultant.')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('workflow.approvalNotes', 'Approval Notes')} ({t('common.optional', 'Optional')})
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workflow.approvalNotesPlaceholder', 'Add any notes or feedback...')}
            rows={2}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="destructive"
            onClick={() => handleDecision('rejected')}
            disabled={isPending}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            {t('workflow.reject', 'Reject')}
          </Button>

          <Button
            variant="default"
            onClick={() => handleDecision('approved')}
            disabled={isPending}
            className="gap-2 bg-success hover:bg-success/90"
          >
            <CheckCircle className="h-4 w-4" />
            {t('workflow.approve', 'Approve')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
