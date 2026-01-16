import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserCheck, ClipboardList, Send, AlertTriangle } from 'lucide-react';
import { useConsultantSubmitForApproval } from '@/hooks/contractor-observation';

interface ConsultantReviewCardProps {
  incidentId: string;
  status: string;
  consultantNotes?: string;
  hasActions?: boolean;
  onActionCreated?: () => void;
}

export function ConsultantReviewCard({
  incidentId,
  status,
  consultantNotes,
  hasActions = false,
  onActionCreated
}: ConsultantReviewCardProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState(consultantNotes || '');
  
  const { mutate: submitForApproval, isPending: isSubmitting } = useConsultantSubmitForApproval();

  const isReviewStage = status === 'pending_consultant_review' || status === 'pending_consultant_actions';
  const canSubmit = hasActions && notes.trim().length > 0;

  if (!isReviewStage) return null;

  const handleSubmitForApproval = () => {
    submitForApproval({
      incidentId,
      notes: notes.trim()
    });
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCheck className="h-5 w-5 text-primary" />
          {t('workflow.consultantReview', 'Consultant Review')}
          <Badge variant="outline" className="ms-auto">
            {status === 'pending_consultant_review' 
              ? t('workflow.pendingReview', 'Pending Review')
              : t('workflow.creatingActions', 'Creating Actions')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {t('workflow.consultantInstructions', 
                'Review the observation details and create required corrective actions. Once all actions are defined, submit for Site Client approval.')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('workflow.reviewNotes', 'Review Notes')}
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workflow.reviewNotesPlaceholder', 'Enter your review findings and notes...')}
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={onActionCreated}
            className="gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            {t('workflow.createAction', 'Create Action')}
          </Button>

          <Button
            onClick={handleSubmitForApproval}
            disabled={!canSubmit || isSubmitting}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {t('workflow.submitForApproval', 'Submit for Approval')}
          </Button>
        </div>

        {!hasActions && (
          <p className="text-xs text-muted-foreground text-center">
            {t('workflow.noActionsWarning', 'Create at least one corrective action before submitting')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
