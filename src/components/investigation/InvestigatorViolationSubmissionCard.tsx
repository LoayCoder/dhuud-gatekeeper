/**
 * Investigator Violation Submission Card
 * 
 * Displayed when a violation has been identified but not yet submitted.
 * Shows occurrence info and allows investigator to submit for approval workflow.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, AlertTriangle, Loader2, CheckCircle2, FileWarning } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSubmitContractorViolation, useIsAssignedInvestigator } from '@/hooks/use-investigator-violation';
import type { IncidentWithDetails } from '@/hooks/use-incidents';
import type { Investigation } from '@/hooks/use-investigation';

interface InvestigatorViolationSubmissionCardProps {
  incident: IncidentWithDetails;
  investigation: Investigation | null;
  onComplete?: () => void;
}

export function InvestigatorViolationSubmissionCard({ 
  incident, 
  investigation, 
  onComplete 
}: InvestigatorViolationSubmissionCardProps) {
  const { t } = useTranslation();
  const [evidenceSummary, setEvidenceSummary] = useState('');
  
  const submitMutation = useSubmitContractorViolation();
  const isAssignedInvestigator = useIsAssignedInvestigator(investigation?.investigator_id);
  
  // Cast to access new columns
  const inv = investigation as Investigation & {
    violation_identified?: boolean;
    violation_type_id?: string;
    violation_occurrence?: number;
    violation_submitted_at?: string;
    contractor_contribution_percentage?: number;
  };
  
  // Only show when violation is identified but not submitted
  const violationIdentified = inv?.violation_identified === true;
  const alreadySubmitted = !!inv?.violation_submitted_at;
  const isInProgress = incident.status === 'investigation_in_progress';
  
  if (!violationIdentified || alreadySubmitted || !isInProgress || !isAssignedInvestigator || !investigation?.id) {
    return null;
  }
  
  const handleSubmit = async () => {
    if (!investigation.id || !evidenceSummary.trim()) return;
    
    await submitMutation.mutateAsync({
      investigationId: investigation.id,
      evidenceSummary: evidenceSummary.trim(),
    });
    
    onComplete?.();
  };
  
  const getOccurrenceLabel = (occurrence: number) => {
    switch (occurrence) {
      case 1: return t('violation.occurrence.first', '1st Occurrence');
      case 2: return t('violation.occurrence.second', '2nd Occurrence');
      case 3: return t('violation.occurrence.third', '3rd Occurrence');
      default: return t('violation.occurrence.subsequent', `${occurrence}th Occurrence`);
    }
  };
  
  return (
    <Card className="border-2 border-warning/50 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-warning" />
            <CardTitle className="text-lg">
              {t('investigation.violation.submitTitle', 'Submit Contractor Violation')}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
            {getOccurrenceLabel(inv.violation_occurrence || 1)}
          </Badge>
        </div>
        <CardDescription>
          {t('investigation.violation.submitDescription', 
            'You have identified a contractor violation. Complete the evidence summary and submit for approval.')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Violation Summary */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('investigation.violation.contributionLabel', 'Contractor Contribution')}
            </span>
            <span className="font-semibold text-primary">
              {inv.contractor_contribution_percentage || 0}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm">
              {t('investigation.violation.identifiedStatus', 'Violation identified and ready for submission')}
            </span>
          </div>
        </div>
        
        {/* Evidence Summary */}
        <div className="space-y-2">
          <Label htmlFor="evidence-summary-submit">
            {t('investigation.violation.evidenceSummaryLabel', 'Final Evidence Summary')} *
          </Label>
          <Textarea
            id="evidence-summary-submit"
            value={evidenceSummary}
            onChange={(e) => setEvidenceSummary(e.target.value)}
            placeholder={t('investigation.violation.evidenceSummaryPlaceholder', 
              'Provide a comprehensive summary of the evidence supporting this violation...')}
            rows={4}
          />
        </div>
        
        {/* Workflow Info */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('investigation.violation.submitWorkflowInfo', 
              'Upon submission, this violation will be sent to the Department Manager for approval, then to the Contract Controller, and finally to the Contractor Representative for acknowledgment.')}
          </AlertDescription>
        </Alert>
        
        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!evidenceSummary.trim() || submitMutation.isPending}
          className="w-full gap-2"
        >
          {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <Send className="h-4 w-4" />
          {t('investigation.violation.submitButton', 'Submit Violation for Approval')}
        </Button>
      </CardContent>
    </Card>
  );
}
