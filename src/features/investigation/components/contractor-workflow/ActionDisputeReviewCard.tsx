import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { 
  MessageSquareWarning, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
const useConsultantResolveActionDispute = () => useMutation({ mutationFn: async (p: any) => p });

interface ActionDisputeReviewCardProps {
  incidentId: string;
  status: string;
  disputeReason?: string;
  contractorComments?: string;
  onResolved?: () => void;
}

export function ActionDisputeReviewCard({
  incidentId,
  status,
  disputeReason,
  contractorComments,
  onResolved
}: ActionDisputeReviewCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState<'resolve' | 'modify' | 'escalate' | null>(null);
  
  const { mutate: resolveDispute, isPending } = useConsultantResolveActionDispute();

  // Only show for action dispute review status
  if (status !== 'pending_action_dispute_review') return null;

  // Map UI resolution to API decision
  const decisionMap: Record<string, 'resolve' | 'modify' | 'escalate_to_hsse'> = {
    'resolve': 'resolve',
    'modify': 'modify',
    'escalate': 'escalate_to_hsse'
  };

  const handleSubmit = () => {
    if (!resolution) return;
    
    resolveDispute({
      incidentId,
      decision: decisionMap[resolution],
      notes: notes.trim() || undefined
    }, {
      onSuccess: onResolved
    });
  };

  return (
    <Card className="border-warning/30 bg-warning/5" dir={direction}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareWarning className="h-5 w-5 text-warning" />
            <CardTitle className="text-lg">
              {t('workflow.actionDispute.title', 'Action Dispute Review')}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            {t('workflow.actionDispute.pending', 'Dispute Pending')}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.actionDispute.description', 'The contractor has disputed an assigned action. Review and resolve.')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Dispute Details */}
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('workflow.actionDispute.reason', 'Dispute Reason')}</AlertTitle>
          <AlertDescription className="mt-2">
            {disputeReason || t('workflow.actionDispute.noReason', 'No reason provided')}
          </AlertDescription>
        </Alert>

        {/* Contractor Comments */}
        {contractorComments && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {t('workflow.actionDispute.contractorComments', 'Contractor Comments')}:
            </p>
            <p className="text-sm">{contractorComments}</p>
          </div>
        )}

        {/* Resolution Options */}
        <div className="space-y-2">
          <Label>{t('workflow.actionDispute.selectResolution', 'Select Resolution')}</Label>
          <div className="grid gap-2">
            <Button
              variant={resolution === 'resolve' ? 'default' : 'outline'}
              className="justify-start gap-2"
              onClick={() => setResolution('resolve')}
            >
              <CheckCircle2 className="h-4 w-4" />
              {t('workflow.actionDispute.resolveDispute', 'Resolve Dispute - Keep Original Action')}
            </Button>
            
            <Button
              variant={resolution === 'modify' ? 'secondary' : 'outline'}
              className="justify-start gap-2"
              onClick={() => setResolution('modify')}
            >
              <RefreshCw className="h-4 w-4" />
              {t('workflow.actionDispute.modifyAction', 'Modify Action Based on Feedback')}
            </Button>
            
            <Button
              variant={resolution === 'escalate' ? 'destructive' : 'outline'}
              className="justify-start gap-2"
              onClick={() => setResolution('escalate')}
            >
              <ArrowUpRight className="h-4 w-4" />
              {t('workflow.actionDispute.escalateToHSSE', 'Escalate to HSSE Expert')}
            </Button>
          </div>
        </div>

        {/* Resolution Notes */}
        {resolution && (
          <div className="space-y-2">
            <Label htmlFor="resolution-notes">
              {t('workflow.actionDispute.resolutionNotes', 'Resolution Notes')}
              {resolution === 'escalate' && ' *'}
            </Label>
            <Textarea
              id="resolution-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('workflow.actionDispute.notesPlaceholder', 'Explain your resolution decision...')}
              rows={3}
            />
            {resolution === 'escalate' && !notes.trim() && (
              <p className="text-xs text-destructive">
                {t('workflow.actionDispute.escalationNotesRequired', 'Notes are required when escalating to HSSE Expert')}
              </p>
            )}
          </div>
        )}

        {/* Submit Button */}
        {resolution && (
          <Button
            className="w-full gap-2"
            onClick={handleSubmit}
            disabled={isPending || (resolution === 'escalate' && !notes.trim())}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t('workflow.actionDispute.submitResolution', 'Submit Resolution')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
