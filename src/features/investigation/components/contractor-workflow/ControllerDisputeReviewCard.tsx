import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Scale, CheckCircle, XCircle, ExternalLink, FileText } from 'lucide-react';
import { useControllerReviewDispute } from '@/hooks/contractor-observation';

interface ControllerDisputeReviewCardProps {
  violationId: string;
  status: string;
  disputeJustification?: string;
  disputeEvidence?: string[];
  violationCategory?: string;
}

export function ControllerDisputeReviewCard({
  violationId,
  status,
  disputeJustification,
  disputeEvidence,
  violationCategory
}: ControllerDisputeReviewCardProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  
  const { mutate: reviewDispute, isPending } = useControllerReviewDispute();

  if (status !== 'pending_dispute_review') return null;

  const handleDecision = (decision: 'upheld' | 'dropped') => {
    reviewDispute({
      violationId,
      decision,
      notes: notes.trim() || undefined
    });
  };

  return (
    <Card className="border-info/20 bg-info/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-info" />
          {t('workflow.disputeReview', 'Dispute Review')}
          <Badge variant="secondary" className="ms-auto">
            {t('workflow.controllerReview', 'Controller Review')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-card p-3 space-y-3">
          {violationCategory && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('workflow.violationCategory', 'Violation Category')}</span>
              <Badge variant="outline">{violationCategory}</Badge>
            </div>
          )}
          
          <div className="space-y-1">
            <span className="text-sm font-medium">{t('workflow.contractorJustification', "Contractor's Justification")}</span>
            <p className="text-sm bg-muted/50 rounded-md p-2">
              {disputeJustification || t('workflow.noJustification', 'No justification provided')}
            </p>
          </div>

          {disputeEvidence && disputeEvidence.length > 0 && (
            <div className="space-y-1">
              <span className="text-sm font-medium">{t('workflow.supportingEvidence', 'Supporting Evidence')}</span>
              <div className="flex flex-wrap gap-2">
                {disputeEvidence.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline bg-muted/50 px-2 py-1 rounded"
                  >
                    <FileText className="h-3 w-3" />
                    {t('workflow.evidence', 'Evidence')} {index + 1}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('workflow.reviewNotes', 'Review Notes')}
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workflow.disputeReviewNotesPlaceholder', 'Document your review findings and decision rationale...')}
            rows={3}
          />
        </div>

        <div className="rounded-lg border border-muted p-3">
          <p className="text-xs text-muted-foreground">
            <strong>{t('workflow.upholdDispute', 'Uphold Dispute')}:</strong> {t('workflow.upholdDisputeDesc', 'Violation will be dropped and removed from contractor record.')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <strong>{t('workflow.rejectDispute', 'Reject Dispute')}:</strong> {t('workflow.rejectDisputeDesc', 'Violation will be finalized and added to contractor record with applicable fines.')}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => handleDecision('dropped')}
            disabled={isPending}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {t('workflow.upholdDispute', 'Uphold Dispute')}
          </Button>

          <Button
            variant="destructive"
            onClick={() => handleDecision('upheld')}
            disabled={isPending}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            {t('workflow.rejectDispute', 'Reject Dispute')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
