import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';
import { useSiteClientApproveViolation } from '@/features/contractors/hooks/use-contractor-observation-workflow';

interface SiteClientViolationApprovalCardProps {
  violationId: string;
  status: string;
  violationCategory?: string;
  violationNotes?: string;
  occurrenceNumber?: number;
}

export function SiteClientViolationApprovalCard({
  violationId,
  status,
  violationCategory,
  violationNotes,
  occurrenceNumber = 1
}: SiteClientViolationApprovalCardProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  
  const { mutate: approveViolation, isPending } = useSiteClientApproveViolation();

  if (status !== 'pending_violation_site_client') return null;

  const handleDecision = (decision: 'approved' | 'rejected') => {
    approveViolation({
      violationId,
      decision,
      notes: notes.trim() || undefined
    });
  };

  const getOccurrenceBadgeColor = (num: number) => {
    if (num >= 3) return 'bg-destructive text-destructive-foreground';
    if (num === 2) return 'bg-warning text-warning-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-destructive" />
          {t('workflow.violationApproval', 'Violation Approval')}
          <Badge className={`ms-auto ${getOccurrenceBadgeColor(occurrenceNumber)}`}>
            {t('workflow.occurrence', 'Occurrence')} #{occurrenceNumber}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {t('workflow.violationIdentified', 'Violation Identified')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('workflow.violationApprovalInstructions', 
                  'Review the identified violation. If approved, it will be sent to Contract Controller for final verification.')}
              </p>
            </div>
          </div>
        </div>

        {violationCategory && (
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">{t('workflow.category', 'Category')}</span>
            <p className="font-medium">{violationCategory}</p>
          </div>
        )}

        {violationNotes && (
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">{t('workflow.consultantNotes', 'Consultant Notes')}</span>
            <p className="text-sm bg-muted/50 rounded-md p-2">{violationNotes}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('workflow.approvalNotes', 'Approval Notes')} ({t('common.optional', 'Optional')})
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workflow.violationApprovalNotesPlaceholder', 'Add any notes regarding this violation...')}
            rows={2}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => handleDecision('rejected')}
            disabled={isPending}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            {t('workflow.rejectViolation', 'Reject Violation')}
          </Button>

          <Button
            variant="destructive"
            onClick={() => handleDecision('approved')}
            disabled={isPending}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {t('workflow.approveViolation', 'Approve Violation')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
